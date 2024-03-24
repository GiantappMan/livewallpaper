using System.IO;
using WallpaperCore.Libs;

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

        [TestMethod]
        public async Task TestGetSnapshot()
        {
            MpvPlayer? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync();
            string videoFile = @"TestWallpapers\audio.mp4";
            _player.LoadFile(videoFile);
            var snapshot = _player.GetSnapshot();

            //从快照恢复player
            _player = GetPlayer(snapshot);
            Assert.IsNotNull(_player);

            var res = _player.GetPath();
            Assert.IsTrue(res == videoFile);
            _player.Quit();
        }

        private MpvPlayer? GetPlayer(MpvPlayerSnapshot? snapshot = null)
        {
            string fullpath = Path.GetFullPath("../../../../../../giantapp-wallpaper-client/Client/Assets/Player/mpv.exe");
            MpvPlayer.PlayerPath = fullpath;
            return new MpvPlayer(snapshot);
        }
    }
}
