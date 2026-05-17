/**
 * 定时任务：每天添加10个新笑话
 * 运行时间：每天早上9点
 * 逻辑：
 * 1. 添加10个新笑话
 * 2. 如果超过200个，删除dislikes最多的10个
 * 3. ID复用，但likes/dislikes/shares重置为0
 * 4. 笑话有createdAt日期时间
 */

const fs = require('fs');
const path = require('path');

const JOKES_FILE = path.join(__dirname, '../database/wawaxiao-jokes.json');
const MAX_JOKES = 200;
const ADD_COUNT = 10;

// 新笑话库（可以不断扩充这个数组）
const NEW_JOKES_POOL = [
  // 校园笑话
  { category: '校园', title: '数学题', content: '老师：小明，1+1等于几？\n小明：我不知道。\n老师：回家问你爸爸。\n小明：爸爸说等于2，但是妈妈说等于3，爷爷说等于5，奶奶说等于8。\n老师：你家到底有几个答案？\n小明：我家没有答案，只有争吵。' },
  { category: '校园', title: '背书', content: '老师让小明背课文。\n小明背到一半停住了。\n老师：继续背啊。\n小明：老师，我背不动了，课文太重了。' },
  { category: '校园', title: '点名', content: '老师点名：张三。\n无人应答。\n老师：张三来了吗？\n李四：老师，张三今天请假了。\n老师：请假条在哪？\n李四：张三请假条上写"因为李四生病了，所以张三要照顾李四"。' },
  
  // 生活笑话
  { category: '生活', title: '买西瓜', content: '顾客：老板，西瓜甜不甜？\n老板：甜！\n顾客：不甜我不要。\n老板：那你不要。\n顾客：我要甜的。\n老板：那你就别问。\n顾客：我问了才能知道。\n老板：知道了就不买了。\n顾客：那我走了。\n老板：走吧。\n顾客走了两步回头：老板，你的西瓜真的甜吗？\n老板：真的甜。\n顾客：那我买一个。\n老板切开西瓜，顾客吃了一口：老板，这西瓜不甜啊。\n老板：你看，问了就没用吧。' },
  { category: '生活', title: '理发', content: '理发师：要剪什么发型？\n顾客：剪短一点。\n理发师剪完。\n顾客：太短了。\n理发师：你说短一点。\n顾客：我是说比现在短一点，不是比所有人都短。\n理发师：那你应该说"剪一点点短"。' },
  { category: '生活', title: '修电脑', content: '客户：电脑坏了，帮我修一下。\n工程师：什么问题？\n客户：开机黑屏。\n工程师：检查了半小时，发现没插电源。\n客户：怪不得我家的电视也看不了。\n工程师：你家电视也没插电源？\n客户：不是，是停电了。' },
  { category: '生活', title: '网购', content: '客服：亲，您的快递已发货。\n顾客：什么时候能到？\n客服：预计3天。\n顾客：能快点吗？\n客服：亲，我们是用马车运送的。\n顾客：马车？现在还用马车？\n客服：亲，我们的马车是电动的。' },
  { category: '生活', title: '外卖', content: '外卖小哥打电话：您好，您的外卖到了，但是门卫不让进。\n顾客：为什么不让进？\n外卖小哥：门卫说外卖不能骑马进小区。\n顾客：你骑马送外卖？\n外卖小哥：不是，我的电动车停在门口，门卫以为是马。\n顾客：为什么？\n外卖小哥：因为电动车上面写着"小马外卖"。' },
  
  // 家庭笑话
  { category: '家庭', title: '爸爸做饭', content: '妈妈出差，爸爸负责做饭。\n第一天：爸爸煮面条，把水烧干了，面条变成了锅巴。\n第二天：爸爸炒鸡蛋，把鸡蛋炒成了蛋壳。\n第三天：爸爸蒸米饭，忘了加水，蒸出来的是爆米花。\n孩子：爸爸，我们还是点外卖吧。\n爸爸：不行，外卖没有爸爸的味道。\n孩子：爸爸的味道就是焦味。' },
  { category: '家庭', title: '爷爷教数学', content: '孙子：爷爷，帮我做数学作业。\n爷爷：什么题目？\n孙子：2+3等于多少？\n爷爷：等于5。\n孙子：5+4等于多少？\n爷爷：等于9。\n孙子：9+6等于多少？\n爷爷：等于15。\n孙子：爷爷你真厉害。\n爷爷：当然，爷爷当年数学考100分。\n孙子：那为什么爸爸说他小时候数学总是不及格？\n爷爷：因为爸爸继承的是奶奶的数学基因。' },
  { category: '家庭', title: '妈妈减肥', content: '妈妈：我要减肥。\n爸爸：好，支持你。\n妈妈：从明天开始不吃晚饭。\n第二天晚上：妈妈在吃蛋糕。\n爸爸：你不是说不吃晚饭吗？\n妈妈：蛋糕不是晚饭，是点心。\n第三天晚上：妈妈在吃炸鸡。\n爸爸：炸鸡也不是晚饭？\n妈妈：炸鸡是夜宵。\n第四天晚上：妈妈在吃火锅。\n爸爸：火锅也不是晚饭？\n妈妈：火锅是晚餐，不是晚饭，晚饭是米饭。' },
  { category: '家庭', title: '外婆的故事', content: '外婆给孙子讲故事。\n外婆：从前有座山，山里有座庙，庙里有个老和尚。\n孙子：外婆，这个故事我听过。\n外婆：那你讲给我听。\n孙子：从前有座山，山里有座庙，庙里有个老和尚，老和尚给小和尚讲故事，讲的什么故事呢？从前有座山...\n外婆：停，这个故事绕晕我了。\n孙子：外婆，你以后还是别讲故事了。' },
  { category: '家庭', title: '奶奶买菜', content: '奶奶去菜市场买菜。\n奶奶：这个白菜多少钱？\n商贩：2块钱一斤。\n奶奶：太贵了，1块钱行不行？\n商贩：不行。\n奶奶走了。\n商贩：奶奶，1块钱卖给你。\n奶奶回来买了白菜。\n第二天，奶奶又来买菜。\n商贩：奶奶，今天白菜2块钱。\n奶奶：昨天1块钱，今天怎么2块钱了？\n商贩：昨天是因为你走了我才降价，今天你不走我也降价。\n奶奶：那我今天先走。\n奶奶走了，商贩喊：奶奶，1块钱。\n奶奶：明天来。' },
  
  // 职场笑话
  { category: '职场', title: '开会', content: '老板：今天的会议很重要，大家要认真听。\n员工A：老板，我听得很认真。\n老板：那你复述一下我刚才说的内容。\n员工A：老板说今天的会议很重要。\n老板：我后面还说了什么？\n员工A：老板说大家要认真听。\n老板：我后面说的内容呢？\n员工A：老板没说。\n老板：我说了半天，你只听到这两句？\n员工A：这两句最重要。' },
  { category: '职场', title: '加班', content: '老板：今天加班到晚上9点。\n员工：老板，为什么加班？\n老板：因为白天工作效率低。\n员工：为什么效率低？\n老板：因为白天开会太多。\n员工：为什么开会太多？\n老板：因为要讨论怎么提高效率。\n员工：那现在加班能提高效率吗？\n老板：不能，但是能完成任务。\n员工：完成任务算效率吗？\n老板：不算，但算加班费。' },
  { category: '职场', title: '请假', content: '员工：老板，我要请假。\n老板：请假理由？\n员工：我要去相亲。\n老板：相亲需要请假吗？\n员工：需要，因为相亲对象是我的老板。\n老板：你的老板是我。\n员工：对，所以我请假去找另一个老板。\n老板：你不想要这份工作了？\n员工：我想找一份有老婆的工作。' },
  { category: '职场', title: '年会', content: '公司年会抽奖。\n一等奖：iPhone。\n二等奖：iPad。\n三等奖：保温杯。\n员工A抽到一等奖。\n老板：恭喜你，明年努力工作。\n员工B抽到二等奖。\n老板：恭喜你，明年继续努力。\n员工C抽到三等奖。\n老板：恭喜你，明年要多喝水。\n员工D没中奖。\n老板：没关系，明年你还有机会抽奖。\n员工D：老板，明年我可以不抽吗？\n老板：为什么？\n员工D：因为我不想喝水。' },
  
  // 更多笑话可以继续添加...
];

// 获取当前时间戳（用于今日最新）
function getTodayTimestamp() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

// 主函数
function addDailyJokes() {
  console.log('===== 开始添加每日笑话 =====');
  console.log('运行时间:', new Date().toLocaleString('zh-CN'));
  
  try {
    // 读取现有笑话
    let jokes = JSON.parse(fs.readFileSync(JOKES_FILE, 'utf8'));
    const currentCount = jokes.length;
    const today = getTodayTimestamp();
    
    console.log(`当前笑话数量: ${currentCount}`);
    
    // 如果超过200个，删除dislikes最多的10个
    if (currentCount >= MAX_JOKES) {
      console.log('超过200个，删除dislikes最多的10个');
      
      // 按dislikes排序，取前10个
      const toDelete = jokes
        .sort((a, b) => b.dislikes - a.dislikes)
        .slice(0, ADD_COUNT)
        .map(j => j.id);
      
      console.log('删除ID:', toDelete);
      
      // 删除这10个笑话
      jokes = jokes.filter(j => !toDelete.includes(j.id));
      
      // 这些ID可以复用
      const reusableIds = toDelete;
      
      // 添加10个新笑话（使用复用ID）
      const newJokes = NEW_JOKES_POOL.slice(0, ADD_COUNT).map((joke, i) => ({
        id: reusableIds[i] || (currentCount - ADD_COUNT + i + 1),
        category: joke.category,
        title: joke.title,
        content: joke.content,
        likes: 0,
        dislikes: 0,
        shares: 0,
        isHot: false,
        status: 'approved',
        createdAt: today,  // 今日最新标记
        images: []
      }));
      
      jokes.push(...newJokes);
      
    } else {
      // 未超过200个，直接添加
      console.log('未超过200个，直接添加10个');
      
      // 获取最大ID
      const maxId = jokes.length > 0 ? Math.max(...jokes.map(j => j.id)) : 0;
      
      // 随机选择10个笑话
      const shuffled = NEW_JOKES_POOL.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, ADD_COUNT);
      
      const newJokes = selected.map((joke, i) => ({
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
        images: []
      }));
      
      jokes.push(...newJokes);
    }
    
    // 重新排序ID
    jokes.sort((a, b) => a.id - b.id);
    
    // 保存
    fs.writeFileSync(JOKES_FILE, JSON.stringify(jokes, null, 2));
    
    console.log(`添加完成，当前笑话数量: ${jokes.length}`);
    console.log('今日新增笑话:', jokes.filter(j => j.createdAt === today).length);
    
    // 返回统计信息
    return {
      success: true,
      total: jokes.length,
      added: ADD_COUNT,
      todayNew: jokes.filter(j => j.createdAt === today).length,
      categories: {
        '职场': jokes.filter(j => j.category === '职场').length,
        '生活': jokes.filter(j => j.category === '生活').length,
        '家庭': jokes.filter(j => j.category === '家庭').length,
        '校园': jokes.filter(j => j.category === '校园').length
      }
    };
    
  } catch (err) {
    console.error('添加笑话失败:', err);
    return { success: false, error: err.message };
  }
}

// 执行
const result = addDailyJokes();
console.log('执行结果:', JSON.stringify(result, null, 2));
