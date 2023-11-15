using WallpaperCore.Players;

namespace WallpaperCore.Test.Players
{
    [TestClass]
    public class MPVPlayerTest
    {
        [TestMethod]
        public async Task TestLaunch()
        {
            MpvPlayer? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync(@"TestWallpapers\playlist.txt");
            _player.Quit();
        }

        [TestMethod]
        public async Task TestGetPath()
        {
            MpvPlayer? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync(@"TestWallpapers\playlist.txt");
            var res = _player.GetPath();
            _player.Quit();

            Assert.IsNotNull(res);
        }
        [TestMethod]
        public async Task TestLoadList()
        {
            MpvPlayer? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync();
            var res = _player.LoadList(@"TestWallpapers\playlist.txt");
            _player.Quit();
        }

        [TestMethod]
        public async Task TestLoadFile()
        {
            MpvPlayer? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync();
            _player.LoadFile(@"TestWallpapers\audio.mp4");
            _player.Quit();
        }

        private MpvPlayer? GetPlayer()
        {
            return MpvPlayer.From("../../../../../../giantapp-wallpaper-client/Client/Assets/Player/mpv.exe");
        }
    }
}
