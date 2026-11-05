/* 训练计划数据：动作说明直接来自你的三张计划图。
   type: weight=负重  assist=辅助（数字越小越强）  body=自重  time=按时间
   met: 用于热量估算的代谢当量（参考 Compendium of Physical Activities） */
const DAYS = {
  d1: { label: 'Day 1', title: '背 + 手臂', focus: '大手臂后侧 · 背部线条 · 全程沉肩' },
  d2: { label: 'Day 2', title: '臀 + 核心', focus: '臀腿发力 · 下腹线条' },
  d3: { label: 'Day 3', title: '全身', focus: '全身巩固 · 下腹和侧腰' },
};

const GOALS = {
  arm:   { name: '大手臂', key: 'triceps-pushdown', hint: '后侧三头是主力' },
  back:  { name: '背部线条', key: 'lat-pulldown', hint: '练背阔，不练斜方肌' },
  core:  { name: '下腹核心', key: 'reverse-crunch', hint: '下腹是重点' },
  glute: { name: '臀腿', key: 'hip-thrust', hint: '大腿和臀部一起练' },
};

const EX = {
  'lat-pulldown': { name: '高位下拉', type: 'weight', goal: 'back', met: 5, step: 5,
    setup: '坐稳，大腿压在护垫下，双手比肩宽握杠', action: '先沉肩，再把杠往下拉到锁骨，手肘往下往后夹', tip: '不要耸肩，不要身体大幅后仰',
    trap: '先沉肩再拉，全程肩膀远离耳朵' },
  'seated-row': { name: '坐姿划船', type: 'weight', goal: 'back', met: 5, step: 5,
    setup: '坐直挺胸，膝盖微弯，双手握把', action: '把手柄拉到肚脐位置，手肘贴着身体往后，夹紧背', tip: '身体不要前后晃，肩膀放松往下',
    trap: '拉到底时肩膀往下沉，不要往上提' },
  'db-row': { name: '单臂哑铃划船', type: 'weight', perSide: true, goal: 'back', met: 5, step: 5,
    setup: '一侧手和膝盖撑在凳子上，背部平直', action: '另一手提哑铃，手肘往上往后拉到腰侧', tip: '像锯木头一样往腰拉，不是往肩拉',
    trap: '手肘朝腰拉，肩膀不要提向耳朵' },
  'straight-arm-pulldown': { name: '绳索直臂下压', type: 'weight', goal: 'back', met: 3.5, step: 5,
    setup: '面对绳索站，上身微前倾，双手握杆举到眼前', action: '手臂几乎伸直，往下压到大腿前', tip: '感觉腋下后背发力，手肘别弯太多' },
  'triceps-pushdown': { name: '绳索三头下压', type: 'weight', goal: 'arm', met: 3.5, step: 5,
    setup: '面对绳索站直，手肘贴在身体两侧', action: '只动小臂，往下压到手臂伸直，停1秒', tip: '大臂全程不动，这是练白白肉的主力' },
  'overhead-extension': { name: '哑铃过头臂屈伸', type: 'weight', goal: 'arm', met: 3.5, step: 5,
    setup: '坐在凳上，双手捧一个哑铃举过头顶', action: '慢慢弯手肘把哑铃放到脑后，再伸直举上去', tip: '大臂贴着耳朵，手肘别往外打开' },
  'db-curl': { name: '哑铃弯举', type: 'weight', goal: 'arm', met: 3.5, step: 5,
    setup: '站直，双手拿哑铃，手心朝前', action: '手肘不动，把哑铃弯举到肩前，慢慢放下', tip: '不要借身体晃动的力' },

  'hip-thrust': { name: '杠铃臀推 / 臀桥', type: 'weight', goal: 'glute', met: 6, step: 10,
    setup: '上背靠凳子，双脚踩地，杠铃放髋部（垫护垫）', action: '臀部发力把髋推高，身体呈一条直线，顶端夹臀1秒', tip: '小腿垂直地面，下巴微收，别塌腰' },
  'rdl': { name: '罗马尼亚硬拉', type: 'weight', goal: 'glute', met: 6, step: 10,
    setup: '站直拿杠铃或哑铃，膝盖微弯并保持不动', action: '屁股往后推，上身前倾，杠贴腿往下到小腿中间，再起身', tip: '背一直挺直，感觉大腿后侧被拉伸' },
  'hip-abduction': { name: '器械髋外展', type: 'weight', goal: 'glute', met: 3.5, step: 10,
    setup: '坐在外展机上，护垫放在膝盖外侧', action: '膝盖往外推开，停1秒，慢合回', tip: '上身可以微微前倾，更练臀' },
  'cable-kickback': { name: '绳索后踢腿', type: 'weight', perSide: true, goal: 'glute', met: 4, step: 5,
    setup: '绳索绑在脚踝，双手扶住机器，上身微前倾', action: '腿伸直往后上方踢，用屁股发力', tip: '腰不要跟着拱起，动作慢一点' },
  'reverse-crunch': { name: '反向卷腹', type: 'body', goal: 'core', met: 3.8, step: 5,
    setup: '平躺，手放身体两侧，屈膝抬腿', action: '用下腹把屁股卷离地面，膝盖往胸口靠，慢慢放下', tip: '练下腹的重点动作，别甩腿借力' },
  'dead-bug': { name: '死虫', type: 'body', perSide: true, goal: 'core', met: 2.8, step: 5,
    setup: '平躺，双手朝天，双腿屈膝抬起成90度', action: '对侧手和腿同时慢慢伸远，腰贴紧地面，再收回换边', tip: '腰离地就是伸太远了' },
  'plank': { name: '平板支撑', type: 'time', goal: 'core', met: 3.8,
    setup: '手肘撑在肩膀正下方，脚尖撑地', action: '收紧腹部和屁股，身体呈一条直线保持', tip: '不塌腰不撅屁股，正常呼吸' },

  'assist-pullup': { name: '辅助引体向上', type: 'assist', goal: 'back', met: 5, step: 5,
    setup: '膝盖跪在辅助机护垫上，双手比肩宽握杠', action: '先沉肩，再拉到下巴过杠，慢慢放下', tip: '辅助重量越大越轻松，慢慢减',
    trap: '每一个都先沉肩，再开始往上拉' },
  'reverse-fly': { name: '反向飞鸟', type: 'weight', goal: 'back', met: 3.5, step: 2.5,
    setup: '拿轻哑铃，屈髋上身前倾，背挺直', action: '手臂微弯，往两侧打开到与肩平，夹紧后背', tip: '用很轻的重量，练后背和肩膀线条',
    trap: '最容易耸肩的动作：脖子一紧就减重' },
  'knee-pushup': { name: '跪姿俯卧撑', type: 'body', goal: 'arm', met: 3.8, step: 5,
    setup: '双手撑地比肩宽，膝盖着地，身体一条直线', action: '身体下降到胸口接近地面，再推起', tip: '手肘往后45度，不要往外大开' },
  'single-leg-bridge': { name: '单腿臀桥', type: 'body', perSide: true, goal: 'glute', met: 3.8, step: 5,
    setup: '平躺，一腿屈膝踩地，另一腿伸直抬起', action: '踩地那条腿的屁股发力把髋顶起，慢慢放下', tip: '髋部保持水平，不要歪' },
  'leg-raise': { name: '仰卧举腿', type: 'body', goal: 'core', met: 3.8, step: 5,
    setup: '平躺，双腿伸直，手放身体两侧', action: '双腿抬到与地面垂直，再慢慢放下，脚不碰地', tip: '腰贴地，太难就微微弯膝' },
  'side-plank': { name: '侧平板', type: 'time', perSide: true, goal: 'core', met: 3.8,
    setup: '侧躺，手肘撑在肩膀正下方', action: '把髋部抬起，身体一条直线保持', tip: '练侧腰，让马甲线更明显' },
};

const PLAN = {
  d1: [
    { ex: 'lat-pulldown', sets: 4, low: 10, high: 12 },
    { ex: 'seated-row', sets: 3, low: 12, high: 12 },
    { ex: 'db-row', sets: 3, low: 10, high: 10 },
    { ex: 'straight-arm-pulldown', sets: 3, low: 12, high: 12 },
    { ex: 'triceps-pushdown', sets: 3, low: 12, high: 12 },
    { ex: 'overhead-extension', sets: 3, low: 12, high: 12 },
    { ex: 'db-curl', sets: 2, low: 12, high: 12 },
  ],
  d2: [
    { ex: 'hip-thrust', sets: 4, low: 10, high: 12 },
    { ex: 'rdl', sets: 3, low: 10, high: 10 },
    { ex: 'hip-abduction', sets: 3, low: 15, high: 15 },
    { ex: 'cable-kickback', sets: 3, low: 12, high: 12 },
    { ex: 'reverse-crunch', sets: 3, low: 12, high: 12 },
    { ex: 'dead-bug', sets: 3, low: 10, high: 10 },
    { ex: 'plank', sets: 3, low: 30, high: 45 },
  ],
  d3: [
    { ex: 'assist-pullup', sets: 3, low: 8, high: 10 },
    { ex: 'reverse-fly', sets: 3, low: 12, high: 12 },
    { ex: 'knee-pushup', sets: 3, low: 10, high: 10 },
    { ex: 'hip-thrust', sets: 3, low: 10, high: 10 },
    { ex: 'single-leg-bridge', sets: 2, low: 12, high: 12 },
    { ex: 'leg-raise', sets: 3, low: 10, high: 10 },
    { ex: 'side-plank', sets: 2, low: 30, high: 30 },
  ],
};

const BODY_METRICS = {
  weightLb: { name: '体重', unit: 'lb' },
  arm: { name: '上臂围', unit: 'in' },
  waist: { name: '腰围', unit: 'in' },
  hip: { name: '臀围', unit: 'in' },
  thigh: { name: '大腿围', unit: 'in' },
};
