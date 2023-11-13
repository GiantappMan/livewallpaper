using WallpaperCore.Players;

namespace WallpaperCore.Test.Players
{
    [TestClass]
    public class MPVPlayerTest
    {
        [TestMethod]
        public async Task TestLaunch()
        {
            MPVPlayer? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.Launch(@"TestWallpapers\playlist.txt");
            _player.Dispose();
        }

        private MPVPlayer? GetPlayer()
        {
            return MPVPlayer.From("../../../../../../giantapp-wallpaper-client/Client/Assets/Player/mpv.exe");
        }
    }
}
