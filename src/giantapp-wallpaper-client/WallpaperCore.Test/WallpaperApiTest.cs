namespace WallpaperCore.Test
{
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

        }

        [TestMethod]
        public void TestGetWallpaperMetaV2()
        {
            string testFolder = "TestWallpapers/v2";
            var wallpapers = WallpaperApi.GetWallpapers(testFolder);

            Assert.IsTrue(wallpapers.Length == 1);
            Assert.IsNotNull(wallpapers[0]?.Meta?.Title);
        }

        [TestMethod]
        public void TestGetWallpaperSetting()
        {

        }
    }
}