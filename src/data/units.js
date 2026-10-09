// 由 scripts/verify-data.mjs 对照 rime-cantonese 字表核对
// 编排原则：每个音节只在课程里正式出现一次（带新音的词最多顺带重复 1 个旧音），
// 目的是让人把所有音都打过一遍，而不是同一个音反复练。
export const UNITS = [
  {
    id: 'u1',
    title: '热身',
    subtitle: '拼写和拼音长得像的音节',
    icon: '🔥',
    trap: null,
    mode: 'type',
    levels: [
      { id: 'u1-1', items: [['文', 'man'], ['飛', 'fei'], ['皮', 'pei'], ['天', 'tin'], ['年', 'nin'], ['冰', 'bing'], ['停', 'ting'], ['高', 'gou'], ['湯', 'tong'], ['老婆', 'lou po'], ['電腦', 'din nou'], ['美麗', 'mei lai']] },
      { id: 'u1-2', items: [['地圖', 'dei tou'], ['父母', 'fu mou'], ['保護', 'bou wu'], ['旁邊', 'pong bin'], ['幫忙', 'bong mong'], ['門鈴', 'mun ling'], ['表面', 'biu min'], ['門票', 'mun piu'], ['本地', 'bun dei'], ['溫度', 'wan dou'], ['毛巾', 'mou gan']] },
    ],
  },
  {
    id: 'u2',
    title: 'j 就是 y',
    subtitle: '拼音的 y，粤拼写成 j',
    icon: '🪝',
    trap: 'j-is-y',
    mode: 'type',
    levels: [
      { id: 'u2-1', items: [['用', 'jung'], ['夜', 'je'], ['朋友', 'pang jau'], ['已經', 'ji ging'], ['然後', 'jin hau'], ['應該', 'jing goi'], ['因為', 'jan wai'], ['一定', 'jat ding'], ['任何', 'jam ho'], ['要求', 'jiu kau'], ['游泳', 'jau wing'], ['飲料', 'jam liu']] },
    ],
  },
  {
    id: 'u3',
    title: 'z / c / s',
    subtitle: '没有 zh ch sh x q，只有 z c s',
    icon: '🐍',
    trap: 'zcs',
    mode: 'type',
    levels: [
      { id: 'u3-1', items: [['四', 'sei'], ['早', 'zou'], ['錢', 'cin'], ['小', 'siu'], ['中', 'zung'], ['七', 'cat'], ['蔬菜', 'so coi'], ['清楚', 'cing co']] },
      { id: 'u3-2', items: [['再見', 'zoi gin'], ['姓名', 'sing ming'], ['西餅', 'sai beng'], ['手機', 'sau gei'], ['重新', 'cung san'], ['寫字樓', 'se zi lau'], ['坐低', 'co dai']] },
    ],
  },
  {
    id: 'u4',
    title: 'aa 和 a',
    subtitle: '长 aa、短 a，一字之差',
    icon: '⚖️',
    trap: 'aa-a',
    mode: 'type',
    levels: [
      { id: 'u4-1', items: [['三', 'saam'], ['米', 'mai'], ['飯', 'faan'], ['教', 'gaau'], ['九', 'gau'], ['山', 'saan'], ['媽', 'maa'], ['藍', 'laam'], ['林', 'lam'], ['爸爸', 'baa baa']] },
      { id: 'u4-2', items: [['大家', 'daai gaa'], ['買餸', 'maai sung'], ['太太', 'taai taai'], ['奶茶', 'naai caa'], ['先生', 'sin saang'], ['冷氣', 'laang hei'], ['男仔', 'naam zai'], ['今晚', 'gam maan'], ['快啲', 'faai di'], ['跑步', 'paau bou']] },
      { id: 'u4-3', items: [['貓仔', 'maau zai'], ['考試', 'haau si'], ['簡單', 'gaan daan'], ['餐廳', 'caan teng'], ['花生', 'faa sang'], ['打電話', 'daa din waa'], ['沙灘', 'saa taan'], ['菠蘿包', 'bo lo baau'], ['大排檔', 'daai paai dong']] },
    ],
  },
  {
    id: 'u5',
    title: 'yu',
    subtitle: '拼音的 ü，粤拼写成 yu',
    icon: '🐟',
    trap: 'yu',
    mode: 'type',
    levels: [
      { id: 'u5-1', items: [['魚', 'jyu'], ['短', 'dyun'], ['暖', 'nyun'], ['月', 'jyut'], ['雪', 'syut'], ['血', 'hyut'], ['村', 'cyun'], ['原來', 'jyun loi'], ['專心', 'zyun sam'], ['團圓', 'tyun jyun'], ['算數', 'syun sou'], ['薯條', 'syu tiu'], ['豬扒包', 'zyu paa baau'], ['算啦', 'syun laa']] },
    ],
  },
  {
    id: 'u6',
    title: 'oe / eo / eoi',
    subtitle: '拼音里没有的圆唇元音',
    icon: '🫧',
    trap: 'oe-eo',
    mode: 'type',
    levels: [
      { id: 'u6-1', items: [['靴', 'hoe'], ['對', 'deoi'], ['上', 'soeng'], ['兩', 'loeng'], ['腳', 'goek'], ['春', 'ceon'], ['最', 'zeoi'], ['鋸', 'goe'], ['香港', 'hoeng gong'], ['開水', 'hoi seoi']] },
      { id: 'u6-2', items: [['唱歌', 'coeng go'], ['藥房', 'joek fong'], ['旅遊', 'leoi jau'], ['樣樣', 'joeng joeng'], ['香蕉', 'hoeng ziu'], ['準時', 'zeon si'], ['信封', 'seon fung'], ['雀仔', 'zoek zai'], ['一齊去', 'jat cai heoi'], ['出去玩', 'ceot heoi waan']] },
    ],
  },
  {
    id: 'u7',
    title: 'gw / kw',
    subtitle: '圆唇的 g 和 k',
    icon: '🌀',
    trap: 'gw-kw',
    mode: 'type',
    levels: [
      { id: 'u7-1', items: [['國', 'gwok'], ['瓜', 'gwaa'], ['軍', 'gwan'], ['廣東', 'gwong dung'], ['關係', 'gwaan hai'], ['習慣', 'zaap gwaan'], ['季節', 'gwai zit'], ['規矩', 'kwai geoi']] },
      { id: 'u7-2', items: [['困難', 'kwan naan'], ['誇張', 'kwaa zoeng'], ['奇怪', 'kei gwaai'], ['骨頭', 'gwat tau'], ['蘋果汁', 'ping gwo zap'], ['光管', 'gwong gun'], ['鬼故', 'gwai gu']] },
    ],
  },
  {
    id: 'u8',
    title: 'p / t / k 结尾',
    subtitle: '短促的入声字',
    icon: '✂️',
    trap: 'ptk',
    mode: 'type',
    levels: [
      { id: 'u8-1', items: [['十', 'sap'], ['六', 'luk'], ['入', 'jap'], ['鴨', 'aap'], ['筆', 'bat'], ['熱', 'jit'], ['黑', 'hak'], ['北', 'bak'], ['石', 'sek'], ['學', 'hok'], ['木', 'muk'], ['屋', 'uk'], ['辣', 'laat'], ['讀書', 'duk syu']] },
      { id: 'u8-2', items: [['食物', 'sik mat'], ['快樂', 'faai lok'], ['叔叔', 'suk suk'], ['衣服', 'ji fuk'], ['客人', 'haak jan'], ['得閒', 'dak haan'], ['覺得', 'gok dak'], ['拍拖', 'paak to'], ['塞車', 'sak ce'], ['結婚', 'git fan'], ['八達通', 'baat daat tung'], ['百貨公司', 'baak fo gung si'], ['地鐵站', 'dei tit zaam']] },
    ],
  },
  {
    id: 'u9',
    title: '唔 m、五 ng 与懒音',
    subtitle: '你 nei 我 ngo，不要懒音',
    icon: '👄',
    trap: 'ng-lazy',
    mode: 'type',
    levels: [
      { id: 'u9-1', items: [['你', 'nei'], ['我', 'ngo'], ['唔', 'm'], ['五', 'ng'], ['外', 'ngoi'], ['硬', 'ngaang'], ['內', 'noi'], ['愛', 'oi'], ['安', 'on']] },
      { id: 'u9-2', items: [['眼鏡', 'ngaan geng'], ['牙刷', 'ngaa caat'], ['銀行', 'ngan hong'], ['牛肉', 'ngau juk'], ['危險', 'ngai him'], ['音樂', 'jam ngok'], ['能力', 'nang lik'], ['晏晝', 'aan zau']] },
    ],
  },
  {
    id: 'u10',
    title: '常用词混合',
    subtitle: '地道口语词，一次打个够',
    icon: '💬',
    trap: null,
    mode: 'type',
    levels: [
      { id: 'u10-1', items: [['多謝', 'do ze'], ['咩事', 'me si'], ['啱啱', 'ngaam ngaam'], ['靚女', 'leng neoi'], ['好攰', 'hou gui'], ['佢哋', 'keoi dei'], ['食咗', 'sik zo'], ['睇下', 'tai haa']] },
      { id: 'u10-2', items: [['點解', 'dim gaai'], ['琴日', 'kam jat'], ['呢度', 'ni dou'], ['傾偈', 'king gai'], ['行街', 'haang gaai'], ['好正', 'hou zeng'], ['等陣', 'dang zan']] },
    ],
  },
  {
    id: 'u11',
    title: '实战',
    subtitle: '用真·粤拼键盘打整句',
    icon: '⌨️',
    trap: null,
    mode: 'ime',
    levels: [
      { id: 'u11-1', items: [['我唔知', 'ngo m zi'], ['多謝晒', 'do ze saai'], ['聽日見', 'ting jat gin'], ['食咗未', 'sik zo mei'], ['快啲嚟', 'faai di lai'], ['你喺邊', 'nei hai bin']] },
      { id: 'u11-2', items: [['我想飲水', 'ngo soeng jam seoi'], ['今日好熱', 'gam jat hou jit'], ['你講乜嘢', 'nei gong mat je'], ['我哋走啦', 'ngo dei zau laa'], ['而家幾點', 'ji gaa gei dim'], ['呢個幾錢', 'ni go gei cin']] },
      { id: 'u11-3', items: [['我想食雪糕', 'ngo soeng sik syut gou'], ['唔該俾杯水', 'm goi bei bui seoi'], ['今日天氣好好', 'gam jat tin hei hou hou'], ['唔好意思遲到', 'm hou ji si ci dou'], ['出面落緊雨', 'ceot min lok gan jyu'], ['做乜咁夜先返', 'zou mat gam je sin faan']] },
    ],
  },
];
