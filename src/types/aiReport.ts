// 与 Rust 侧 `AiReport` 序列化结构对齐（serde_json 默认 snake_case 字段名）。
// 引擎所有结构全程 Serialize，字段名保持 snake_case。

export interface AiReport {
  metadata: AiMetadata;
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
}

export interface AiCangGanPillar {
  pillar: string;
  entries: AiCangGanEntry[];
}

export interface AiCangGanEntry {
  gan: string;
  wuxing: string;
  role: string;
  commander_days: number | null;
}

export interface SanYuan {
  ri_zhu: string;
  tou_gan: any[];
  tong_gen: any[];
  gai_tou_jiao_jiao: any[];
  zuo_zhi: any;
  de_di: boolean;
  de_shi: boolean;
  de_sheng: boolean;
  bijie_count: number;
  summary: string;
}

export interface CrossPillarEnergy {
  action: string;
  pair: string;
  from_pillar: string;
  from_zhi: string;
  to_pillar: string;
  to_zhi: string;
  label: string;
  source: string;
  corpus_id: number | null;
  infer_type: string;
  distance_weight: number;
  yue_ling_involved: boolean;
  affects_yong_shen: string;
  final_energy: number;
  reason: string;
}

export interface AiChongHe {
  cross_pillar: AiCrossPillar[];
  tian_gan_he: AiTianGanHe[];
  summary: string[];
  counts: Record<string, number>;
}

export interface AiCrossPillar {
  action: string;
  pair: string;
  from_pillar: string;
  from_zhi: string;
  to_pillar: string;
  to_zhi: string;
  label: string;
  source: string;
  corpus_id: number | null;
  infer_type: string;
  distance_weight: number;
  yue_ling_involved: boolean;
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

export interface WangShuaiVerdict {
  verdict: string;
  score: number;
  de_di: boolean;
  de_shi: boolean;
  de_sheng: boolean;
  month_state: string;
  month_benqi_shen: string;
  method: string;
  confidence: string;
  limitations: string[];
  evidence: string[];
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
}

export interface GeJuResult {
  geju: string;
  category: string;
  yue_ling_yong_shen: string;
  is_cheng: boolean;
  cheng_reason: string;
  is_po: boolean;
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
  corpus_refs: number[];
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
  ji_xiong: string;
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
  verdict: string;
  ying_qi_year: number | null;
  corpus_refs: number[];
}

export interface SuiYunTrigger {
  is_tai_sui_chong: boolean;
  tai_sui_targets: string[];
  is_sui_yun_bing_lin: boolean;
  bing_lin_example: string | null;
  dark_chong: string[];
  strong_trigger_years: number[];
  per_year: SuiYunYear[];
}

export interface SuiYunYear {
  year: number;
  ganzhi: string;
  is_tai_sui_chong: boolean;
  is_bing_lin: boolean;
  triggered: string[];
  fluctuation: number;
}

export interface AiDaYun {
  qi_yun: AiQiYun;
  dayun_list: AiDaYunStep[];
  yearly: AiYearly[];
  note: string | null;
}

export interface AiQiYun {
  age: number;
  year: number;
  forward: boolean;
}

export interface AiDaYunStep {
  index: number;
  start_age: number | null;
  end_age: number | null;
  ganzhi: string;
  gan: string;
  zhi: string;
}

export interface AiYearly {
  year: number;
  ganzhi: string;
  gan_wuxing: string;
  zhi_wuxing: string;
  fluctuation: number;
  relations: string[];
}

export interface AiClassic {
  source: string;
  title: string;
  content: string;
  match_type: string;
  corpus_id: number | null;
  tier: number;
  matched_keys: string[];
}

export interface AiGoldenCase {
  source: string;
  label: string;
  four_pillars: string;
  gender: string;
  match_kind: string;
  content: string;
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
