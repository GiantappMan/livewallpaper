namespace WallpaperCore.Test;

[TestClass]
public class WallpaperApiTest
{
    [TestMethod]
    public void TestGetWallpapers()
    {
        string testFolder = "TestWallpapers";
        var wallpapers = WallpaperApi.GetWallpapers(testFolder);

        Assert.IsTrue(wallpapers.Length > 0);
    }

    [TestMethod]
    public void TestGetWallpaperMeta()
    {
        string testFolder = "TestWallpapers/meta";
        var wallpapers = WallpaperApi.GetWallpapers(testFolder);

        Assert.IsTrue(wallpapers.Length == 1);
        Assert.IsTrue(wallpapers[0]?.Meta.Title == "Test Title");
    }

    [TestMethod]
    public void TestGetWallpaperMetaV2()
    {
        string testFolder = "TestWallpapers/v2";
        var wallpapers = WallpaperApi.GetWallpapers(testFolder);

        Assert.IsTrue(wallpapers.Length == 1);
        Assert.IsNotNull(wallpapers[0]?.Meta.Title);
    }

    [TestMethod]
    public void TestGetWallpaperSetting()
    {
        string testFolder = "TestWallpapers/setting";
        var wallpapers = WallpaperApi.GetWallpapers(testFolder);

        Assert.IsTrue(wallpapers.Length == 1);
        //Assert.IsTrue(wallpapers[0]?.Setting.Volume == 5);
    }
}