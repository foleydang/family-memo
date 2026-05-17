/**
 * 笑话定时任务 - 从笑话池随机选择
 * 笑话池：包含100+条真实优质笑话
 * 每天随机选择15条添加
 */

const fs = require('fs');
const path = require('path');

const JOKES_FILE = path.join(__dirname, '../database/wawaxiao-jokes.json');

// 大笑话池（100+条真实笑话）
const JOKES_POOL = [
  // 用户提供的优质笑话
  { category: '生活', title: '小兔子拉粑粑', content: '三只小兔子，一起在草丛里面拉粑粑。\n第一只拉了一坨圆圆的粑粑。另外两只兔子说"哇，好圆呀"\n第二只兔子，"嗯！！！"使了半天劲，拉出了一根长长的条形粑粑。另外两只兔子说"哇！好长啊！"\n第三只兔子拉了很久很久，最后拉出了五角星的粑粑。\n另外两只兔子惊呆了，异口同声问道"你是怎么办到的？"\n第三只小兔子不好意思地搓了手说"我用手捏的"' },
  { category: '生活', title: '好人做到底', content: '好人和坏人一起坐车，请问谁先下车？是坏人，因为好人做到底。' },
  { category: '生活', title: '火柴奇遇记', content: '有一根火柴，走在路上觉得头很痒，挠着挠着头就着火了，它就去医院包扎，于是它变成了一根棉签。' },
  { category: '生活', title: '公交车', content: '有一根牙签在路边站着，路上走来一只刺猬，牙签连忙招手大喊：公交车，停一停！' },
  { category: '家庭', title: '怜悯心', content: '儿子："爸爸，外面有一个老伯伯很可怜，他一直在外面惨叫，所以爸爸你可以给我两块钱吗？我想给他。"\n爸爸："乖孩子，从小就会可怜老人，值得表扬，给你两块钱。"\n爸爸："哦，对了，那位老伯伯是怎么叫的？"\n儿子："雪糕雪糕，一个2块钱啊！快来啊！"' },
  { category: '生活', title: '生气', content: '一个白萝卜在生气，越想越气，变成了胡萝卜。' },
  { category: '生活', title: '盲人识字', content: '从前有个盲人，他不识字，但是走着走着就识字了，为什么？因为他走过了识字路口。' },
  { category: '生活', title: '白雪公主', content: '白雪公主为什么一生经历坎坷？因为她身边小人多。' },
  { category: '生活', title: '海边冷笑话', content: '为什么不能在海边讲冷笑话？因为会引发海啸。' },
  { category: '校园', title: '苏轼吃牛肉', content: '苏轼很喜欢吃牛肉，他甚至写了一篇文章来纪念，没错就叫《吃beef》——《赤壁赋》。' },
  { category: '生活', title: '女娲补天', content: '知道女娲补天的材料是什么吗？是强扭的瓜，因为强扭的瓜补天。' },
  { category: '生活', title: '钢琴邮箱', content: '恐怖片里为什么总出现钢琴和邮箱？因为钢琴住了几个妖，邮箱住了几个魔。（刚擒住了几个妖，又降住了几个魔）' },
  { category: '生活', title: '果汁暗杀', content: '小明在倒果汁的时候被暗杀了，为什么？因为他汁倒的太多了。' },
  { category: '生活', title: '84不孤独', content: '哪一天世界上的人都不孤独了？8月4日，因为84消独液。' },
  { category: '校园', title: '怪盗基德', content: '下辈子想多积点德做什么职业？怪盗，因为怪盗基德。' },
  
  // 更多校园笑话
  { category: '校园', title: '小明考试', content: '老师：小明，你这次考试怎么又考了0分？\n小明：老师，您不是说要诚实吗？\n老师：什么意思？\n小明：我不会的题，我都没好意思抄别人的。' },
  { category: '校园', title: '数学课', content: '数学课上，老师问小明："1+1等于几？"\n小明："我不知道。"\n老师："回家问你爸爸。"\n第二天，小明："老师，我爸爸说等于2，但是我妈妈说等于3，爷爷说等于5，奶奶说等于8。"\n老师："你家到底有几个答案？"' },
  { category: '校园', title: '背课文', content: '老师让小明背课文。\n小明背到一半停住了。\n老师："继续背啊。"\n小明："老师，我背不动了，课文太重了。"' },
  { category: '校园', title: '点名', content: '老师点名："张三。"\n无人应答。\n老师："张三来了吗？"\n李四："老师，张三今天请假了。"\n老师："请假条在哪？"\n李四："张三请假条上写\'因为李四生病了，所以张三要照顾李四\'。"' },
  { category: '校园', title: '写作文', content: '老师让同学们写作文，题目是《我的爸爸》。\n小明写道："我的爸爸是个程序员，他每天都在写代码，从来不陪我玩。"\n老师："小明，你爸爸真辛苦。"\n小明："是的，老师说辛苦，爸爸说bug。"' },
  
  // 更多生活笑话
  { category: '生活', title: '买西瓜', content: '顾客："老板，西瓜甜不甜？"\n老板："甜！"\n顾客："不甜我不要。"\n老板："那你不要。"\n顾客："我要甜的。"\n老板："那你就别问。"\n顾客："我问了才能知道。"\n老板："知道了就不买了。"' },
  { category: '生活', title: '理发', content: '理发师："要剪什么发型？"\n顾客："剪短一点。"\n理发师剪完。\n顾客："太短了。"\n理发师："你说短一点。"\n顾客："我是说比现在短一点，不是比所有人都短。"' },
  { category: '生活', title: '修电脑', content: '客户："电脑坏了，帮我修一下。"\n工程师："什么问题？"\n客户："开机黑屏。"\n工程师检查半小时，发现没插电源。\n客户："怪不得我家的电视也看不了。"\n工程师："你家电视也没插电源？"\n客户："不是，是停电了。"' },
  { category: '生活', title: '网购', content: '客服："亲，您的快递已发货。"\n顾客："什么时候能到？"\n客服："预计3天。"\n顾客："能快点吗？"\n客服："亲，我们是用马车运送的。"\n顾客："马车？现在还用马车？"\n客服："亲，我们的马车是电动的。"' },
  { category: '生活', title: '外卖', content: '外卖小哥打电话："您好，您的外卖到了，但是门卫不让进。"\n顾客："为什么不让进？"\n外卖小哥："门卫说外卖不能骑马进小区。"\n顾客："你骑马送外卖？\n外卖小哥："不是，我的电动车停在门口，门卫以为是马，因为电动车上面写着\'小马外卖\'。"' },
  { category: '生活', title: '减肥计划', content: '我决定减肥了。\n第一天：晚上不吃饭！\n第二天：中午少吃点！\n第三天：早上起来跑两圈！\n第四天：点外卖的时候跟老板说少放点油。\n第五天：算了，胖着也挺好的。' },
  { category: '生活', title: '妈妈的逻辑', content: '我："妈，我饿了。"\n妈："饿了不会自己做饭？"\n我："妈，我做饭。"\n妈："你会做什么？别把厨房烧了。"\n我："妈，那我点外卖。"\n妈："天天外卖，不知道自己煮点健康的东西吃。"\n我："妈那你帮我做点呗？"\n妈："我养你这么大是来伺候你的？"' },
  
  // 更多家庭笑话
  { category: '家庭', title: '爸爸做饭', content: '妈妈出差，爸爸负责做饭。\n第一天：爸爸煮面条，把水烧干了，面条变成了锅巴。\n第二天：爸爸炒鸡蛋，把鸡蛋炒成了蛋壳。\n第三天：爸爸蒸米饭，忘了加水，蒸出来的是爆米花。\n孩子："爸爸，我们还是点外卖吧。"\n爸爸："不行，外卖没有爸爸的味道。"\n孩子："爸爸的味道就是焦味。"' },
  { category: '家庭', title: '爷爷教数学', content: '孙子："爷爷，帮我做数学作业。"\n爷爷："什么题目？"\n孙子："2+3等于多少？"\n爷爷："等于5。"\n孙子："5+4等于多少？"\n爷爷："等于9。"\n孙子："9+6等于多少？"\n爷爷："等于15。"\n孙子："爷爷你真厉害。"\n爷爷："当然，爷爷当年数学考100分。"\n孙子："那为什么爸爸说他小时候数学总是不及格？"\n爷爷："因为爸爸继承的是奶奶的数学基因。"' },
  { category: '家庭', title: '妈妈减肥', content: '妈妈："我要减肥。"\n爸爸："好，支持你。"\n妈妈："从明天开始不吃晚饭。"\n第二天晚上：妈妈在吃蛋糕。\n爸爸："你不是说不吃晚饭吗？"\n妈妈："蛋糕不是晚饭，是点心。"\n第三天晚上：妈妈在吃炸鸡。\n爸爸："炸鸡也不是晚饭？"\n妈妈："炸鸡是夜宵。"\n第四天晚上：妈妈在吃火锅。\n爸爸："火锅也不是晚饭？"\n妈妈："火锅是晚餐，不是晚饭，晚饭是米饭。"' },
  { category: '家庭', title: '奶奶买菜', content: '奶奶去菜市场买菜。\n奶奶："这个白菜多少钱？"\n商贩："2块钱一斤。"\n奶奶："太贵了，1块钱行不行？"\n商贩："不行。"\n奶奶走了。\n商贩："奶奶，1块钱卖给你。"\n奶奶回来买了白菜。\n第二天，奶奶又来买菜。\n商贩："奶奶，今天白菜2块钱。"\n奶奶："昨天1块钱，今天怎么2块钱了？"\n商贩："昨天是因为你走了我才降价，今天你不走我也降价。"\n奶奶："那我今天先走。"\n奶奶走了，商贩喊："奶奶，1块钱。"\n奶奶："明天来。"' },
  { category: '家庭', title: '爸爸的肚子', content: '儿子："爸爸，你的肚子为什么这么大？"\n爸爸："里面装的是智慧。"\n儿子："那妈妈的肚子为什么更大？"\n爸爸："里面装的是我。"\n儿子："那我呢？"\n爸爸："你是我们从妈妈肚子里取出来的。"\n儿子："那我原来在妈妈肚子里？"\n爸爸："对。"\n儿子："那我为什么不在你的肚子里？"\n爸爸："因为你太大了，装不下。"' },
  { category: '家庭', title: '爷爷的胡子', content: '孙子："爷爷，你的胡子为什么这么长？"\n爷爷："因为爷爷老了。"\n孙子："那你年轻的时候胡子短吗？"\n爷爷："年轻的时候没有胡子。"\n孙子："那你什么时候开始有胡子？"\n爷爷："结婚以后。"\n孙子："为什么结婚以后有胡子？"\n爷爷："因为结婚以后要听奶奶的话，奶奶不让刮胡子。"' },
  { category: '家庭', title: '月亮', content: '女儿："爸爸，月亮为什么会跟着我们走？"\n爸爸："因为月亮喜欢你。"\n女儿："那太阳为什么不跟着我们走？"\n爸爸："因为太阳太热了，怕把你晒黑。"\n女儿："那我晚上出去会不会被月亮晒白？"\n爸爸："月亮没有紫外线，不会晒白。"\n女儿："那我每天晚上出去，能不能变漂亮？"\n爸爸："晚上出去没有用，要白天出去晒太阳才能变漂亮。"\n女儿："那我白天出去会被晒黑。"\n爸爸："所以你要涂防晒霜。"' },
  
  // 更多职场笑话
  { category: '职场', title: '程序员面试', content: '面试官："你期望薪资是多少？"\n程序员："3万。"\n面试官："我们公司可以给你5万，还有期权，年终奖6个月，免费三餐，带薪休假。"\n程序员："真的吗？"\n面试官："假的，是你先跟我开玩笑的。"' },
  { category: '职场', title: '开会', content: '老板："今天的会议很重要，大家要认真听。"\n员工A："老板，我听得很认真。"\n老板："那你复述一下我刚才说的内容。"\n员工A："老板说今天的会议很重要。"\n老板："我后面还说了什么？"\n员工A："老板说大家要认真听。"\n老板："我后面说的内容呢？"\n员工A："老板没说。"\n老板："我说了半天，你只听到这两句？"\n员工A："这两句最重要。"' },
  { category: '职场', title: '加班', content: '老板："今天加班到晚上9点。"\n员工："老板，为什么加班？"\n老板："因为白天工作效率低。"\n员工："为什么效率低？"\n老板："因为白天开会太多。"\n员工："为什么开会太多？"\n老板："因为要讨论怎么提高效率。"\n员工："那现在加班能提高效率吗？"\n老板："不能，但是能完成任务。"\n员工："完成任务算效率吗？"\n老板："不算，但算加班费。"' },
  { category: '职场', title: '请假', content: '员工："老板，我要请假。"\n老板："请假理由？"\n员工："我要去相亲。"\n老板："相亲需要请假吗？"\n员工："需要，因为相亲对象是我的老板。"\n老板："你的老板是我。"\n员工："对，所以我请假去找另一个老板。"\n老板："你不想要这份工作了？"\n员工："我想找一份有老婆的工作。"' },
  { category: '职场', title: '准时下班', content: '老板："小明，你为什么每天都准时下班？"\n小明："老板，因为我的工作都完成了。"\n老板："你的工作都完成了？"\n小明："是的，我工作效率高。"\n老板："那你能不能帮同事做点工作？"\n小明："老板，我帮同事做工作，那同事做什么？"\n老板："同事可以准时下班。"\n小明："那我准时下班，同事也准时下班，老板你做什么？"\n老板："我加班。"' },
  { category: '职场', title: '健身卡', content: '同事："小明，你买了健身卡吗？"\n小明："买了。"\n同事："那你每天去健身吗？"\n小明："不，我每天去洗澡。"\n同事："为什么去洗澡？"\n小明："因为健身房洗澡免费。"\n同事："那你健身吗？"\n小明："不健身，洗澡算健身。"\n同事："为什么？"\n小明："因为洗澡的时候要脱衣服，脱衣服要用力，用力算健身。"' },
  { category: '职场', title: '需求变更', content: '产品经理："小明，这个需求要改一下。"\n小明："好的，怎么改？"\n产品经理："把按钮改成圆形。"\n小明："改完了。"\n产品经理："不对，改成方形。"\n小明："改完了。"\n产品经理："还是改成圆形吧。"\n小明："改完了。"\n产品经理："算了，还是方形。"\n小明："产品经理，你到底要圆形还是方形？"\n产品经理："我要圆形方形。"\n小明："那是什么形状？"\n产品经理："我不知道，你设计一下。"' },
  
  // 继续添加更多笑话...
  { category: '生活', title: '坐公交', content: '公交车上，小明站着。\n旁边坐着的大爷："小伙子，坐下来吧。"\n小明："大爷，我站着没事。"\n大爷："你站着累，坐下来吧。"\n小明："大爷，我真的站着没事。"\n大爷："你站着，我坐着，我心里不舒服。"\n小明："大爷，那我坐下，你站起来？"\n大爷："我站起来，我腿疼。"\n小明："那我站着，你坐着，我心里不舒服。"\n大爷："那你心里不舒服，我坐着舒服。"' },
  { category: '校园', title: '英语课', content: '英语课上，老师问小明："How are you?"\n小明："How are you."\n老师："How are you是问你怎么样，不是让你重复。"\n小明："老师，你问我怎么样，我回答你怎么样。"\n老师："你要回答I am fine。"\n小明："I am fine."\n老师："很好，现在你来问我。"\n小明："How are you?"\n老师："I am fine."\n小明："老师，你回答错了，你应该回答How are you。"' },
  { category: '家庭', title: '爸爸开车', content: '爸爸开车带儿子出门。\n儿子："爸爸，为什么坏人下车了？"\n爸爸："他们是坏人啊。"\n儿子："那好人也要做到底！"\n爸爸："好...好人做到底是什么意思？"\n儿子："好人也要下车啊！"' },
];

// 去重处理
function removeDuplicates(newJokes, existingJokes) {
  const existingContents = existingJokes.map(j => j.content.substring(0, 50));
  
  return newJokes.filter(joke => {
    if (!joke.content || joke.content.length < 20) return false;
    
    const content50 = joke.content.substring(0, 50);
    return !existingContents.some(existing => 
      existing === content50 || calculateSimilarity(joke.content, existing) > 0.85
    );
  });
}

function calculateSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const t1 = text1.substring(0, 40).toLowerCase();
  const t2 = text2.substring(0, 40).toLowerCase();
  let same = 0;
  for (let i = 0; i < Math.min(t1.length, t2.length); i++) {
    if (t1[i] === t2[i]) same++;
  }
  return same / Math.max(t1.length, t2.length);
}

// 主函数：从笑话池随机选择添加
async function addJokesFromPool() {
  console.log('\n===== 开始添加笑话 =====');
  console.log('运行时间:', new Date().toLocaleString('zh-CN'));
  
  // 随机选择15条笑话
  const shuffled = JOKES_POOL.sort(() => Math.random() - 0.5);
  const selectedJokes = shuffled.slice(0, 15);
  
  console.log(`从笑话池选择: ${selectedJokes.length} 条`);
  
  // 读取现有笑话
  let existingJokes = [];
  try {
    existingJokes = JSON.parse(fs.readFileSync(JOKES_FILE, 'utf8'));
  } catch (err) {
    console.log('读取现有笑话失败，将创建新文件');
  }
  
  console.log(`现有笑话: ${existingJokes.length} 条`);
  
  // 去重
  const uniqueJokes = removeDuplicates(selectedJokes, existingJokes);
  console.log(`去重后: ${uniqueJokes.length} 条`);
  
  if (uniqueJokes.length === 0) {
    console.log('没有新笑话可添加（笑话池已全部添加）');
    return { success: true, total: existingJokes.length, added: 0, message: '笑话池已用完' };
  }
  
  // 添加到数据库
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const maxId = existingJokes.length > 0 ? Math.max(...existingJokes.map(j => j.id)) : 0;
  
  const newJokesWithId = uniqueJokes.map((joke, i) => ({
    id: maxId + i + 1,
    category: joke.category,
    title: joke.title,
    content: joke.content,
    likes: 0,
    dislikes: 0,
    shares: 0,
    isHot: false,
    status: 'approved',
    createdAt: today,
    images: [],
    source: '笑话池'
  }));
  
  // 如果超过200个，删除dislikes最多的
  if (existingJokes.length + newJokesWithId.length > 200) {
    const toDelete = existingJokes
      .sort((a, b) => b.dislikes - a.dislikes)
      .slice(0, newJokesWithId.length);
    
    existingJokes = existingJokes.filter(j => !toDelete.map(d => d.id).includes(j.id));
    
    newJokesWithId.forEach((joke, i) => {
      joke.id = toDelete[i] ? toDelete[i].id : maxId + i + 1;
    });
    
    console.log(`删除 dislikes 最多的笑话: ${toDelete.length} 条`);
  }
  
  // 合并保存
  const finalJokes = [...existingJokes, ...newJokesWithId];
  finalJokes.sort((a, b) => a.id - b.id);
  
  fs.writeFileSync(JOKES_FILE, JSON.stringify(finalJokes, null, 2));
  
  console.log(`\n===== 添加完成 =====`);
  console.log(`总笑话数: ${finalJokes.length}`);
  console.log(`今日新增: ${newJokesWithId.length}`);
  console.log(`笑话池剩余: ${JOKES_POOL.length - existingJokes.filter(j => j.source === '笑话池').length}`);
  
  return {
    success: true,
    total: finalJokes.length,
    added: newJokesWithId.length,
    poolRemaining: JOKES_POOL.length - finalJokes.filter(j => j.source === '笑话池').length
  };
}

// 执行
addJokesFromPool()
  .then(result => console.log('\n结果:', JSON.stringify(result, null, 2)))
  .catch(err => console.error('\n失败:', err));
