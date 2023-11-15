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
            await _player.LaunchAsync(@"TestWallpapers\playlist.txt");
            await Task.Delay(1000);
            _player.Dispose();
        }

        [TestMethod]
        public async Task TestGetPath()
        {
            MPVPlayer? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync(@"TestWallpapers\playlist.txt");
            var res = _player.GetPath();
            _player.Dispose();

            Assert.IsNotNull(res);
        }

        private MPVPlayer? GetPlayer()
        {
            return MPVPlayer.From("../../../../../../giantapp-wallpaper-client/Client/Assets/Player/mpv.exe");
        }
    }
}
