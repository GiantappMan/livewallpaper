# 免费开源的动态壁纸工具
## 本仓库是完整的项目，代码比较多而且冗余。 
## 核心代码请看我新开的仓库 https://github.com/MscoderStudio/LiveWallpaperEngine

#### 无流氓，极简UI，省内存只有核心功能。你需要的只是动态壁纸，不是其他什么漂亮的软件~
#### 用不起wallpaper engine的有免费版用了...
 

## 客户端
![client](https://github.com/WallpaperTools/WallpaperTool/blob/master/screenshots/client.png)
## 商店
![store](https://github.com/WallpaperTools/WallpaperTool/blob/master/screenshots/store.png)
## 早期Demo
![早期Demo](https://github.com/WallpaperTools/WallpaperTool/blob/master/screenshots/example.gif)

## 关于本项目：
  * 动态壁纸的WPF实现版本，类似wallpaper engine
  * 只支持Win10比较新的版本，因为用了Win10特性
  * Golang制作的一个小型解析器，有兴趣的可以按源码api，开发自己的壁纸源。
  * UI能省既省，我的目的是动态壁纸，不希望在UI花太多精力。也不想为了实现一点UI，搞太多黑科技。
  * 有Win10内购只是一种捐赠形式，没有功能限制。但是目前商店不知道能否通过，无法使用。
  * 多语言其实是支持的，鉴于我的英语水平没有翻译。有好心人可以pull这里  [链接](https://github.com/MscoderStudio/LiveWallpaper/blob/master/LiveWallpaper/Res/Languages/zh.json)
  * c#交流群：191034956
   
       
## 目前的不足：
  * 只支持视频壁纸，exe和web其实demo是支持的，实现也很容易。后面看用户反馈，有需求在做
  * 声音无法关闭，可以通过系统音量混合器，禁音Livewallpaper。后面看用户反馈，有需求在做
  * 不支持自定义分组。后面看用户反馈，有需求在做
  * 对WPF性能的一些担忧（打算用Go制作一个纯净版，直接用Web UI控制。或者用进程通信，每次UI可以完全释放，只保留壁纸核心进程省内存，都只是初步想法，是否实现还是看用户量吧）
        
## 三步参与代码：
  * Start项目
  * Fork修改代码
  * Issues提交问题

## 编译源码：
  * Clone 代码
  * 打开VS2017
  * 设置LiveWallpaper.App为启动项
  * 修改解决方案配置为 ReleaseUWP/DebugUWP
  * 运行吧

## 感谢：
  * 如果你觉得本项目对你有帮助，请star支持一下~

## 项目官网
https://mscoder.cn/products/LiveWallpaper.html  
[动态壁纸工具 下载](https://www.microsoft.com/store/apps/9MV8GK87MZ05)  
[壁纸商店 下载](https://www.microsoft.com/store/apps/9PNN27P9SS38)  

c#交流群：191034956
