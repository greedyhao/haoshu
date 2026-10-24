// 与 Rust 侧 `AiReport` 序列化结构对齐（serde_json 默认 snake_case 字段名）。
// 契约依据：工作区根目录《评审整改方案.md》第 1 节 · schema v1.1（2026-10-24）。
// 原则：只声明引擎实际输出、GUI 实际消费的字段；无法解释的分数字段一律不进入类型。

export interface AiReport {
  metadata: AiMetadata;
  /** schema v1.1 新增：出生与交运元数据（直录无出生日期时内部字段为 null） */
  birth_meta: BirthMeta;
  input: AiInput;
  bazi: AiBazi;
  cang_gan: AiCangGan;
  san_yuan: SanYuan;
  cross_pillar_energy: CrossPillarEnergy[];
  chonghe: AiChongHe;
  shensha: AiShenSha;
  wang_shuai: AiWangShuai;
  wang_shuai_verdict: WangShuaiVerdict;
  tiao_hou: TiaoHou;
  geju: GeJuResult;
  xing_qing: XingQingCard;
  fen_ke: FenKeZhuanXiang;
  lian_dong: LianDong;
  sui_yun: SuiYunTrigger | null;
  dayun: AiDaYun | null;
  classics: AiClassic[];
  golden_cases: AiGoldenCase[];
  liu_yue: AiLiuYue | null;
}

export interface AiMetadata {
  engine_version: string;
  generated_at: string;
  corpus_db_sha256: string;
  corpus_books_count: number;
  shensha_count: number;
  schema_version: string;
  source_doc: string;
  ai_prompt_hint: string;
}

// ============================================================
// 出生与交运元数据（schema v1.1 §1.2）
// ============================================================

export interface BirthMeta {
  /** 公历 / 农历 / 八字直录 */
  calendar_input: string;
  /** ISO8601 带 +08:00；纯直录无出生日期时为 null */
  solar_datetime: string | null;
  timezone: string;
  timezone_note: string;
  /** 是否做了经度真太阳时校正 */
  true_solar_time: boolean;
  /** 纯直录无出生日期时为 null */
  jieqi: BirthJieQi | null;
  /** 纯直录无起运信息时为 null */
  qi_yun: BirthQiYun | null;
}

export interface BirthJieQi {
  prev: JieQiPoint;
  next: JieQiPoint;
  /** 月柱依据的节（如 白露） */
  month_boundary: string;
  /** 月柱定界说明（近似日期表 ±1 天，边界出生需复核） */
  month_boundary_note: string;
  source: string;
}

export interface JieQiPoint {
  name: string;
  datetime: string;
}

export interface BirthQiYun {
  algorithm: string;
  /** 出生到目标节的精确天数差 */
  days_to_term: number;
  /** 起运岁数；直录未反推出生日期时为 0（未知） */
  age: number;
  jiao_yun_datetime: string | null;
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
  gender: string; // 引擎已转为中文： "男" | "女"
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

export interface AiCangGan {
  pillars: AiCangGanPillar[];
  /** 人元表说明（schema v1.1 新增） */
  rule_note: string;
}

export interface AiCangGanPillar {
  /** 柱标识：年柱 / 月柱 / 日柱 / 时柱 */
  pillar: string;
  entries: AiCangGanEntry[];
}

export interface AiCangGanEntry {
  gan: string;
  wuxing: string;
  /** 本气 / 中气 / 余气 */
  role: string;
  commander_days: number | null;
}

// ============================================================
// 三元解析（schema v1.1 §1.3）
// ============================================================

export interface SanYuan {
  ri_zhu: string;
  tou_gan: TouGan[];
  /** 通根明细：只收地支藏干五行 == 日主五行的根（含同类异干） */
  tong_gen: TongGen[];
  tong_gen_summary: string;
  /** 印星：天干 + 地支藏干分开统计 */
  yin_xing: YinXing;
  /** 比劫：天干计数 + 地支藏干明细 */
  bi_jie: BiJie;
  gai_tou_jiao_jiao: GaiTouJiaoJiao[];
  zuo_zhi: ZuoZhi;
  de_di: boolean;
  de_shi: boolean;
  de_sheng: boolean;
  /** 旧义：含日主的天干比劫数；GUI 不使用 */
  bijie_count: number;
  summary: string;
}

export interface TouGan {
  gan: string;
  from_pillar: string;
  from_zhi: string;
  from_zhi_role: string;
  is_yue_ling: boolean;
  shen: string;
}

export interface TongGen {
  gan: string;
  root_pillar: string;
  root_zhi: string;
  /** 本气 / 中气 / 余气 */
  root_role: string;
  root_type: string;
  root_kind: string;
  /** 藏干五行与日主五行相同（通根定义上恒 true） */
  same_wuxing: boolean;
  /** 藏干与日主是否同一天干 */
  same_stem: boolean;
  /** 深 / 中 */
  depth: string;
  detail: string;
}

export interface YinXing {
  /** 天干印星（值为天干字；GUI 只用 count_tou_gan 与 summary） */
  tou_gan: string[];
  /** 地支藏干印星明细 */
  zhi: YinXingZhi[];
  count_tou_gan: number;
  count_zhi: number;
  summary: string;
}

export interface YinXingZhi {
  pillar: string;
  zhi: string;
  gan: string;
  role: string;
  shen: string;
}

export interface BiJie {
  /** 除日主外的比劫天干数 */
  tou_gan: number;
  zhi: YinXingZhi[];
  count_zhi: number;
  summary: string;
}

export interface GaiTouJiaoJiao {
  pillar: string;
  gan: string;
  zhi: string;
  /** 盖头（天干克地支）/ 截脚（地支克天干） */
  kind: string;
  desc: string;
}

export interface ZuoZhi {
  zhi: string;
  zhi_wuxing: string;
  entries: ZuoZhiEntry[];
  main_shen: string;
}

export interface ZuoZhiEntry {
  gan: string;
  wuxing: string;
  role: string;
}

/** 跨柱能量（《总纲》§5.8 八条规则综合，0-1；仅内部参考，界面不展示数值） */
export interface CrossPillarEnergy {
  /** 规则1：月令基准权重（提纲 1.0 / 他柱 0.6） */
  yue_ling_base: number;
  /** 规则2：距离权重（邻位 1.0 / 隔位 0.25 / 遥隔 0.0） */
  distance_weight: number;
  /** 规则3：双方有根有气 */
  has_root: boolean;
  /** 规则3：作用是否有效 */
  is_valid: boolean;
  /** 规则4：分层作用（干对干/支对支） */
  layer: string;
  /** 规则5：合化状态 */
  he_hua_status: string;
  /** 规则6：空亡减力系数 */
  kong_wang_factor: number;
  /** 规则7：待岁运引动 */
  dai_fa_flag: boolean;
  /** 规则8：优先级消解链 */
  priority_chain: string[];
  /** 综合力量（0-1） */
  final_energy: number;
  /** 助用神 / 损用神 / 待用神 */
  affects_yong_shen: string;
}

// ============================================================
// 冲合刑害（schema v1.1 §1.4）
// ============================================================

export interface AiChongHe {
  cross_pillar: AiCrossPillar[];
  tian_gan_he: AiTianGanHe[];
  summary: string[];
  /** 固定 10 个键，无则 0；不再出现旧键「三合」「三会」 */
  counts: ChongHeCounts;
  /** 半合提示（如 酉丑半合金）；无则空数组 */
  semi_he: string[];
  notes: string[];
}

export interface ChongHeCounts {
  六冲: number;
  六合: number;
  三刑: number;
  相害: number;
  破: number;
  天干五合: number;
  "三合(全)": number;
  "三合(半)": number;
  "三会(全)": number;
  "三会(半)": number;
}

export interface AiCrossPillar {
  action: string;
  pair: string;
  from_pillar: string;
  from_zhi: string;
  to_pillar: string;
  to_zhi: string;
  /** 现代中性表述（Lead 契约小更新：label 为现代中性表述） */
  label: string;
  source: string;
  corpus_id: number | null;
  infer_type: string;
  distance_weight: number;
  yue_ling_involved: boolean;
  /** 古籍原文（Lead 契约小更新） */
  original_text: string;
  /** schema v1.1 新增：现代解读与适用条件（非本盘结论） */
  modern_note: string;
  /** schema v1.1 新增：古籍断语原文背景 */
  context_note: string;
}

export interface AiTianGanHe {
  gan_a: string;
  gan_b: string;
  pos_a: string;
  pos_b: string;
  transform: string;
  can_transform: boolean;
  reason: string;
}

export interface AiShenSha {
  by_pillar: AiShenShaPillar[];
  combinations: AiShenShaCombo[];
  details: AiShenShaDetail[];
}

export interface AiShenShaPillar {
  pillar: string;
  cross_pillar_weight: string;
  shensha: string[];
}

export interface AiShenShaCombo {
  name: string;
  description: string;
  pillars: string[];
}

export interface AiShenShaDetail {
  name: string;
  category: string;
  short_desc: string;
  rule_text: string;
  lookup_summary: string;
  koujue: string;
  full_text: string;
  sources: AiShenShaSource[];
}

export interface AiShenShaSource {
  book_name: string;
  chapter_name: string;
  content: string;
  line_range: string;
}

// ============================================================
// 五行旺衰（schema v1.1 §1.5 §1.6）
// ============================================================

export interface AiWangShuai {
  /** 与 wang_shuai_verdict.verdict 完全一致（统一裁决） */
  ri_zhu_level: string;
  /** 旧字段：判断日主五行是否与月令五行相同；GUI 以 verdict.de_ling 为准 */
  ri_zhu_de_ling: boolean;
  strongest: string;
  weakest: string;
  /** 只保留定性等级，不再输出 score/percentage */
  scores: Record<string, AiEnergyLevel>;
  /** 统一裁决来源说明 */
  level_source: string;
  /** 占比说明：内部权重、未经验证、界面不展示数值 */
  scores_note: string;
}

export interface AiEnergyLevel {
  level: string;
}

export interface WangShuaiVerdict {
  /** 身旺 / 偏旺 / 中和 / 偏弱 / 身弱（与 wang_shuai.ri_zhu_level 一致） */
  verdict: string;
  de_ling: boolean;
  de_di: boolean;
  de_shi: boolean;
  de_sheng: boolean;
  month_state: string;
  month_benqi_shen: string;
  method: string;
  confidence: string;
  /** 等级推导：逐条说明得令/得地/得生/得势如何得出裁决 */
  level_derivation: string[];
  /** 旧字段保留（精简版证据） */
  evidence: string[];
  limitations: string[];
  /** 保留但 GUI 不展示数值 */
  wuxing_deviation: Record<string, number>;
}

export interface TiaoHou {
  ri_zhu: string;
  yue_ling: string;
  season: string;
  is_cold: boolean;
  is_hot: boolean;
  is_dry: boolean;
  is_wet: boolean;
  yong_shen: string[];
  reason: string;
  source_book: string;
  corpus_id: number | null;
  /** schema v1.1 新增：调候取用状态说明 */
  status: string;
}

// ============================================================
// 格局与用神（schema v1.1 §1.7）
// ============================================================

export interface GeJuResult {
  geju: string;
  category: string;
  yue_ling_yong_shen: string;
  is_cheng: boolean;
  cheng_reason: string;
  is_po: boolean;
  /** 未破 / 轻破 / 重破 */
  po_level: string;
  po_eval: PoEval;
  /** 旧字段保留，文案与新逻辑一致 */
  po_reason: string;
  yong_shen: string[];
  yong_shen_gan: string[];
  xi_shen: string[];
  ji_shen: string[];
  qu_yong_fa: string;
  method: string;
  confidence: string;
  limitations: string[];
  conflicts: string[];
  /** schema v1.1 新增：多流派用神并列 + 优先级 + 裁决 + 免责（外格可为 null） */
  yong_shen_resolution: YongShenResolution | null;
  corpus_refs: number[];
}

export interface PoEval {
  month_ling_clashed: boolean;
  clash_detail: string;
  yong_shen_tou_gan: boolean;
  rescue: string;
  conclusion: string;
}

export interface YongShenResolution {
  schools: YongShenSchool[];
  /** 优先级，如 ["扶抑", "调候"] */
  priority: string[];
  decision: string;
  reason: string;
  disclaimer: string;
}

export interface YongShenSchool {
  /** 流派名，如 格局法（子平真诠）/ 调候法（穷通宝鉴）/ 扶抑法 */
  school: string;
  yong_shen: string[];
  basis: string;
}

export interface XingQingCard {
  ri_gan_xiang: string;
  zuo_zhi_xiang: string;
  shi_shen_xiang: string[];
  wuxing_deviation: Record<string, string>;
  geju_xiang: string;
  shensha_marks: string[];
  tiao_hou_xiang: string;
  verdict: string;
  corpus_refs: number[];
}

// ============================================================
// 分科 / 联动（schema v1.1 §1.11：吉凶二元 → 倾向词 + basis）
// ============================================================

export interface FenKeZhuanXiang {
  career: FenKeItem;
  wealth: FenKeItem;
  marriage: FenKeItem;
  children: FenKeItem;
  health: FenKeItem;
  parents: FenKeItem;
}

export interface FenKeItem {
  key_star: string[];
  core_palace: string;
  strength: string;
  /** 倾向词：偏顺 / 中性 / 需协调 / 需谨慎（概率性） */
  ji_xiong: string;
  /** 倾向依据（引擎暂未单独输出时，依据已含在 ji_xiong 括号内；可选） */
  basis?: string;
  shensha_detail: string[];
  corpus_refs: number[];
}

export interface LianDong {
  links: LianDongLink[];
}

export interface LianDongLink {
  triggered_by: string;
  triggers: string[];
  matters: string[];
  /** 倾向词：偏顺 / 中性 / 需协调 / 需谨慎（概率性） */
  verdict: string;
  /** 倾向依据（引擎暂未单独输出；可选） */
  basis?: string;
  ying_qi_year: number | null;
  corpus_refs: number[];
}

// ============================================================
// 岁运引动 / 大运流年（schema v1.1 §1.8 §1.9）
// ============================================================

export interface SuiYunTrigger {
  is_tai_sui_chong: boolean;
  tai_sui_targets: string[];
  is_sui_yun_bing_lin: boolean;
  /** 只列真正并临年份（流年干支 == 该年所处大运干支） */
  bing_lin_years: number[];
  bing_lin_example: string | null;
  /** 明六冲（岁运引动），替代旧 dark_chong */
  ming_chong: string[];
  /** 关系密集年（非吉凶），替代旧 strong_trigger_years */
  notable_years: number[];
  notable_note: string;
  per_year: SuiYunYear[];
}

export interface SuiYunYear {
  year: number;
  ganzhi: string;
  current_dayun: string | null;
  current_dayun_index: number | null;
  is_tai_sui_chong: boolean;
  is_bing_lin: boolean;
  yuan_ju_relations: string[];
  dayun_relations: string[];
  gan_relations: string[];
  signals: string[];
}

export interface AiDaYun {
  qi_yun: AiQiYun;
  dayun_list: AiDaYunStep[];
  yearly: AiYearly[];
  note: string | null;
}

export interface AiQiYun {
  /** 起运岁数；直录未反推出生日期时为 0（未知） */
  age: number;
  /** 交运公历年份（= 第一步大运起始年）；直录未知时为 0 */
  year: number;
  forward: boolean;
  /** 首次交运精确时刻；直录无起运信息时为 null */
  jiao_yun_datetime: string | null;
  algorithm: string;
  days_to_term: number | null;
}

export interface AiDaYunStep {
  index: number;
  start_age: number | null;
  end_age: number | null;
  start_year: number | null;
  end_year: number | null;
  ganzhi: string;
  gan: string;
  zhi: string;
  /** 该步大运交运精确时刻；直录无起运信息时为 null */
  jiao_yun_datetime: string | null;
}

export interface AiYearly {
  year: number;
  ganzhi: string;
  /** 该年所处大运干支（起运前为 null） */
  current_dayun: string | null;
  /** 该年所处大运序号（1-based，未知为 null） */
  current_dayun_index: number | null;
  gan_wuxing: string;
  zhi_wuxing: string;
  /** 流年与原局关系 */
  yuan_ju_relations: string[];
  /** 流年与大运关系 */
  dayun_relations: string[];
  /** 流年天干与原局/大运天干关系 */
  gan_relations: string[];
  /** 关系分类标签（如 冲大运 / 天干合） */
  signals: string[];
}

// ============================================================
// 典籍 / 命例（schema v1.1 §1.10）
// ============================================================

export interface AiClassic {
  source: string;
  title: string;
  content: string;
  match_type: string;
  corpus_id: number | null;
  tier: number;
  matched_keys: string[];
  /** 原文背景标注（如「原文背景」） */
  quote_kind: string;
  /** 原文背景说明：非本命盘直接判词，引用需结合适用条件 */
  context_note: string;
}

export interface AiGoldenCase {
  source: string;
  label: string;
  four_pillars: string;
  gender: string;
  match_kind: string;
  content: string;
  /** 古籍命例，非本人经历，仅作背景参考 */
  disclaimer: string;
}

export interface AiLiuYue {
  year: number;
  liunian: string;
  months: AiLiuYueMonth[];
}

export interface AiLiuYueMonth {
  lunar_month: number;
  ganzhi: string;
  nayin: string;
  relations: string[];
}
