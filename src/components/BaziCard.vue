<script setup lang="ts">
import { computed } from "vue";
import type {
  AiBazi,
  AiCangGan,
  AiCangGanEntry,
  AiShiShen,
  BirthMeta,
  JieQiPoint,
} from "../types/aiReport";
import { formatDateTime } from "../lib/datetime";

const props = defineProps<{
  bazi: AiBazi;
  cangGan: AiCangGan | null;
  birthMeta: BirthMeta | null;
  shiShen: AiShiShen[];
}>();

const pillars = [
  { tag: "年", label: "年柱", key: "year" },
  { tag: "月", label: "月柱", key: "month" },
  { tag: "日", label: "日柱", key: "day" },
  { tag: "时", label: "时柱", key: "hour" },
] as const;

const cang = computed(() => props.cangGan);
const birth = computed(() => props.birthMeta);

const cangGanByPillar = computed<Record<string, AiCangGanEntry[] | undefined>>(() => {
  const map: Record<string, AiCangGanEntry[] | undefined> = {};
  for (const p of props.cangGan?.pillars ?? []) {
    map[p.pillar] = p.entries;
  }
  return map;
});

const shiShenByPillar = computed<Record<string, AiShiShen | undefined>>(() => {
  const map: Record<string, AiShiShen | undefined> = {};
  for (const s of props.shiShen) {
    map[s.pillar] = s;
  }
  return map;
});

const columns = computed(() =>
  pillars.map((p) => {
    const ganzhi = props.bazi[p.key];
    return {
      tag: p.tag,
      label: p.label,
      gan: ganzhi.charAt(0),
      zhi: ganzhi.charAt(1),
      ganShen: shiShenByPillar.value[p.label]?.gan_shi_shen ?? "—",
      zhiShen: shiShenByPillar.value[p.label]?.zhi_shi_shen ?? "—",
      cang: cangGanByPillar.value[p.label] ?? [],
    };
  }),
);

function roleShort(role: string): string {
  if (role === "本气") return "本";
  if (role === "中气") return "中";
  if (role === "余气") return "余";
  return role;
}

function jieqiText(point: JieQiPoint | null | undefined): string {
  if (!point) return "—";
  return `${point.name} ${formatDateTime(point.datetime)}`;
}
</script>

<template>
  <div class="panel bazi-card">
    <h2>四柱排盘</h2>
    <p class="meta-line">
      日主 <b>{{ bazi.ri_zhu }}</b> · 月令 <b>{{ bazi.yue_ling }}</b> ·
      {{ bazi.gender }} · 大运{{ bazi.dayun_direction }}
    </p>

    <div class="pillars">
      <div class="pillar" v-for="c in columns" :key="c.tag">
        <span class="tag">{{ c.tag }}柱</span>
        <div class="gz">
          <span class="char gan">{{ c.gan }}</span>
          <span class="shen">{{ c.ganShen }}</span>
        </div>
        <div class="gz">
          <span class="char zhi">{{ c.zhi }}</span>
          <span class="shen">{{ c.zhiShen }}</span>
        </div>
        <div class="cang">
          <span class="cang-label">藏干</span>
          <span v-for="e in c.cang" :key="e.gan + e.role" class="cang-item">
            {{ e.gan }}<em>{{ roleShort(e.role) }}</em>
          </span>
          <span v-if="c.cang.length === 0" class="muted">—</span>
        </div>
      </div>
    </div>

    <p class="footnote" v-if="cang?.rule_note">人元表：{{ cang.rule_note }}</p>

    <div class="birth-meta" v-if="birth">
      <h3>出生与交运元数据</h3>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="k">输入历法</span>
          <span class="v">{{ birth?.calendar_input || "—" }}</span>
        </div>
        <div class="meta-item">
          <span class="k">公历时刻</span>
          <span class="v">{{ formatDateTime(birth?.solar_datetime) }}</span>
        </div>
        <div class="meta-item">
          <span class="k">时区</span>
          <span class="v">{{ birth?.timezone || "—" }}</span>
        </div>
        <div class="meta-item">
          <span class="k">真太阳时</span>
          <span class="v">{{ birth?.true_solar_time ? "已校正" : "未校正" }}</span>
        </div>
        <div class="meta-item">
          <span class="k">前一节令</span>
          <span class="v">{{ jieqiText(birth?.jieqi?.prev) }}</span>
        </div>
        <div class="meta-item">
          <span class="k">后一节令</span>
          <span class="v">{{ jieqiText(birth?.jieqi?.next) }}</span>
        </div>
        <div class="meta-item">
          <span class="k">月柱依据</span>
          <span class="v">{{ birth?.jieqi?.month_boundary || "—" }} 节</span>
        </div>
        <div class="meta-item">
          <span class="k">起运</span>
          <span class="v">{{ birth?.qi_yun && birth.qi_yun.age > 0 ? birth.qi_yun.age + " 岁" : "未知" }}</span>
        </div>
        <div class="meta-item">
          <span class="k">首次交运</span>
          <span class="v">{{ formatDateTime(birth?.qi_yun?.jiao_yun_datetime) }}</span>
        </div>
        <div class="meta-item wide">
          <span class="k">起运算法</span>
          <span class="v">
            {{ birth?.qi_yun?.algorithm || "—" }}
            <template v-if="birth?.qi_yun?.days_to_term != null">
              （距节 {{ birth.qi_yun.days_to_term }} 日）
            </template>
          </span>
        </div>
      </div>
      <p class="footnote" v-if="birth?.timezone_note">时区说明：{{ birth.timezone_note }}</p>
      <p class="footnote" v-if="birth?.jieqi?.month_boundary_note">
        月柱定界说明：{{ birth.jieqi.month_boundary_note }}
      </p>
      <p class="footnote" v-if="birth?.jieqi?.source">节令来源：{{ birth.jieqi.source }}</p>
    </div>
    <p class="footnote" v-else>未提供出生日期（八字直录），出生与交运元数据不可用。</p>
  </div>
</template>

<style scoped>
.meta-line {
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 13px;
}
.meta-line b {
  color: var(--text);
}
.gz {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.2;
  margin: 2px 0;
}
.char {
  font-size: 24px;
  font-weight: 700;
}
.shen {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}
.cang {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 3px;
  margin-top: 6px;
  border-top: 1px dashed var(--border);
  padding-top: 6px;
}
.cang-label {
  font-size: 11px;
  color: var(--muted);
}
.cang-item {
  font-size: 12px;
  padding: 0 5px;
  border-radius: 8px;
  background: #e8ecf3;
}
.cang-item em {
  font-style: normal;
  font-size: 10px;
  color: var(--muted);
  margin-left: 1px;
}
.muted {
  color: var(--muted);
  font-size: 12px;
}
.footnote {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
}
.birth-meta {
  margin-top: 14px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.birth-meta h3 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--muted);
}
.meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}
.meta-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  min-width: 0;
}
.meta-item.wide {
  grid-column: 1 / -1;
}
.meta-item .k {
  flex: 0 0 64px;
  color: var(--muted);
}
.meta-item .v {
  color: var(--text);
  overflow-wrap: break-word;
  word-break: break-word;
}
@media (max-width: 760px) {
  .char {
    font-size: 20px;
  }
  .shen {
    font-size: 10px;
  }
  .cang-item {
    font-size: 11px;
    padding: 0 4px;
  }
  .meta-grid {
    grid-template-columns: 1fr;
  }
  .meta-item .k {
    flex-basis: 58px;
  }
}
</style>
