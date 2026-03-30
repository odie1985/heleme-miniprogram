# 喝了么 - 小程序 MVP

当前核心能力：
- 日历记录：点击任意日期，弹出快捷记录（喝酒/健身）
- 动态列表：支持查看我的/好友/全部动态，并按类型筛选
- 统计与我的：微信登录同步头像昵称，点击头像/昵称/签名直接修改
- 好友社交：个人二维码、输入好友码添加、扫码二维码添加

## 页面结构
- `pages/calendar/index`：日历 + 当天记录 + 快捷弹层记账
- `pages/feed/index`：动态流（支持范围筛选 + 类型筛选）
- `pages/profile/index`：个人卡 + 登录 + 好友入口 + 月度统计
- `pages/friend-qr/index`：展示个人好友二维码
- `pages/friend-add/index`：输入好友码或扫码添加好友

## 数据结构（本地存储）
```js
{
  id: string,
  type: 'drink' | 'fitness',
  date: 'YYYY-MM-DD',
  content: string,
  amount: string,
  createdAt: number
}
```

## 下一步建议
1. 接入微信云开发数据库（实现真实好友跨设备互看动态）
2. 将二维码生成切换为小程序后端签名服务（避免第三方二维码服务依赖）
3. 增加好友搜索/申请/同意流程
