# 喝了么 - 微信小程序

`喝了么` 是一个围绕“喝酒记录 + 健身记录 + 好友分享”设计的小程序。
当前版本已经从最初的 MVP 往前走了一大步，核心体验包括欢迎页、日历记录、朋友圈式动态流、个人页统计、好友添加与分享回流。

## 当前能力

- 欢迎页：新增独立开屏欢迎页，支持自动跳转和手动跳过，视觉风格可继续扩展为活动页或广告位
- 日历记录：点击日期查看当天记录，右下角 `+` 打开快速记录
- 快速记录：支持喝酒/健身两种类型，带种类、场景、状态、时长、图片、地点
- 日期标记：日历上可区分喝酒和健身记录，今天日期持续高亮
- 记录管理：支持新增、修改、删除记录
- 个人资料：支持微信登录、头像昵称同步、手动修改头像/昵称/签名、手机号授权
- 好友体系：支持个人二维码、扫码加好友、好友码添加
- 动态页：已升级为朋友圈风格动态流，可看我的动态、好友动态、全部动态
- 动态互动：支持点赞、评论，支持展示文字、图片、定位
- 统计页：支持月度统计、酒类占比、场景占比、月份切换
- 分享能力：支持朋友圈分享，分享落地页支持图片和记录内容展示

## 页面结构

- `pages/welcome/index`：欢迎页 / 启动海报页
- `pages/calendar/index`：日历页、当天记录、快速记录弹层、朋友圈分享入口
- `pages/feed/index`：朋友圈式动态流，支持我的/好友/全部与类型筛选
- `pages/profile/index`：个人资料、登录、好友入口、二维码、月度统计
- `pages/friend-add/index`：扫码添加好友
- `pages/friend-qr/index`：展示个人好友二维码

## 当前数据模型

### 记录

```js
{
  id: string,
  source: 'self',
  ownerId: string,
  nickname: string,
  avatarUrl: string,
  type: 'drink' | 'fitness',
  date: 'YYYY-MM-DD',
  content: string,
  amount: string,
  locationName: string,
  images: string[],
  latitude: number,
  longitude: number,
  createdAt: number,
  updatedAt?: number
}
```

### 好友动态

```js
{
  id: string,
  source: 'friend',
  friendCode: string,
  nickname: string,
  avatarUrl: string,
  type: 'drink' | 'fitness',
  date: 'YYYY-MM-DD',
  content: string,
  amount: string,
  locationName: string,
  images: string[],
  createdAt: number
}
```

### 动态互动

```js
{
  liked: boolean,
  likeCount: number,
  comments: [
    {
      id: string,
      nickname: string,
      text: string,
      createdAt: number
    }
  ]
}
```

## 本地存储

当前主要使用微信本地存储：

- `hlm_records_v1`：我的记录
- `hlm_user_v1`：当前用户资料
- `hlm_friends_v1`：好友列表
- `hlm_friend_shares_v1`：好友动态
- `hlm_feed_interactions_v1`：动态点赞与评论

## 最近几次开发内容

- 欢迎页分支：新增欢迎页，并多轮调整视觉风格，当前主线已包含欢迎页版本
- 分享落地页分支：修复朋友圈分享落地页图片显示，优化落地页内容展示
- 动态页分支：把原本简单列表升级为朋友圈式动态流，并补上点赞评论
- 文档分支整理：新增人工回归清单与提审前检查清单

## 文档

- [提审前检查清单](/Users/cooper/Desktop/heleme-miniprogram/docs/pre-release-checklist.md)
- [手动回归清单](/Users/cooper/Desktop/heleme-miniprogram/docs/manual-regression-checklist.md)

## 当前状态

- `main` 已合入欢迎页改造
- `main` 已合入朋友圈式动态页改造
- GitHub 远端已同步最新主线

## 下一步建议

1. 接入微信云开发数据库，解决跨设备好友动态同步
2. 把朋友圈分享图片改成更稳定的云端分享链路
3. 给动态页增加更像微信的点赞评论展示和删除评论能力
4. 增加好友申请、同意、拒绝的完整社交流程
5. 继续打磨欢迎页，使其支持节日海报、活动页或广告位切换
