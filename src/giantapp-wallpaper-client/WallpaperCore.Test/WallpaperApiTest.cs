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

        }

        [TestMethod]
        public void TestGetWallpaperSetting()
        {

        }
    }
}