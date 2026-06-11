export const colors = {
  // 主色 (Academic Blue)
  primary: {
    50:  "#EEF2F8",
    100: "#D8E0EF",
    300: "#7A8FC4",
    500: "#003399",
    700: "#00256E",
    900: "#001442",
  },
  
  // 严重等级(学术配色,非商业警告色)
  severity: {
    critical: "#A8281D",  // 深红,而非鲜红
    high:     "#C46A24",  // 赭石橙
    moderate: "#B4901F",  // 暗金黄
    low:      "#3B7E58",  // 苔藓绿
  },
  
  // 权限类别(参考 ColorBrewer Set2)
  permission: {
    location:   "#5E81AC",
    camera:     "#B48EAD",
    microphone: "#BF616A",
    contacts:   "#D08770",
    sms:        "#EBCB8B",
    storage:    "#88C0D0",
    phone:      "#A3BE8C",
    network:    "#5E81AC",
    sensors:    "#8FBCBB",
    calendar:   "#B48EAD",
  },
  
  // 国产系统对比专用
  comparison: {
    android:     "#3DDC84",  // Android 品牌绿(在对比图中保留)
    openharmony: "#0066B3",  // OpenHarmony 蓝
    neutral:     "#7C7C7C",
  },
  
  // 数据可视化梯度(顺序)
  gradient: {
    blue:  ["#EEF2F8", "#D8E0EF", "#A1B1D6", "#7A8FC4", "#4A66A8", "#003399"],
    red:   ["#F8EEEE", "#F0D8D8", "#D6A1A1", "#C47A7A", "#A84A4A", "#9F0F0F"],
    diverging: ["#003399", "#7A8FC4", "#FFFFFF", "#C47A7A", "#9F0F0F"],
  },
  
  // 灰阶
  gray: {
    50: "#FAFAFA", 100: "#F4F4F5", 200: "#E4E4E7",
    300: "#D4D4D8", 400: "#A1A1AA", 500: "#71717A",
    600: "#52525B", 700: "#3F3F46", 800: "#27272A",
    900: "#18181B",
  },
};
