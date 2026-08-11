// 与 Rust 侧 `AiReport` 序列化结构对齐（serde_json 默认 snake_case 字段名）。
// 仅声明 MVP 渲染用到的字段，其余以 any / 索引签名兜底，避免类型膨胀。

export interface AiReport {
  metadata: any;
  input: AiInput;
  bazi: AiBazi;
  cang_gan: any;
  san_yuan: any;
  cross_pillar_energy: any[];
  chonghe: any;
  shensha: AiShenSha;
  wang_shuai: AiWangShuai;
  wang_shuai_verdict: any;
  tiao_hou: any;
  geju: any;
  xing_qing: any;
  fen_ke: any;
  lian_dong: any;
  sui_yun: any;
  dayun: any;
  classics: any[];
  golden_cases: any[];
  liu_yue: any;
}

export interface AiInput {
  calendar: string;
  is_leap: boolean;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  bazi_direct: string[] | null;
  gender: string;
}

export interface AiBazi {
  year: string;
  month: string;
  day: string;
  hour: string;
  ri_zhu: string;
  yue_ling: string;
  gender: string;
  dayun_direction: string;
  shi_shen: AiShiShen[];
  wuxing_count: Record<string, number>;
}

export interface AiShiShen {
  pillar: string;
  alias: string;
  palace: string;
  life_stage: string;
  gan_shi_shen: string;
  zhi_shi_shen: string;
}

export interface AiShenSha {
  by_pillar: AiShenShaPillar[];
  combinations: any[];
  details: AiShenShaDetail[];
}

export interface AiShenShaPillar {
  pillar: string;
  cross_pillar_weight: string;
  shensha: string[];
}

export interface AiShenShaDetail {
  name: string;
  category: string;
  short_desc: string;
  rule_text: string;
  lookup_summary: string;
  koujue: string;
  full_text: string;
  sources: any[];
}

export interface AiWangShuai {
  ri_zhu_level: string;
  ri_zhu_de_ling: boolean;
  strongest: string;
  weakest: string;
  scores: Record<string, AiEnergyScore>;
}

export interface AiEnergyScore {
  score: number;
  percentage: number;
  level: string;
}
