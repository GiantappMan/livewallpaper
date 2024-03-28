using System.IO;
using WallpaperCore.Libs;
using WallpaperCore.WallpaperRenders;

namespace WallpaperCore.Test.Players
{
    [TestClass]
    public class MPVPlayerTest
    {
        [TestMethod]
        public async Task TestLaunch()
        {
            MpvApi? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync(@"TestWallpapers\playlist.txt");
            _player.Quit();
        }

        [TestMethod]
        public async Task TestGetPath()
        {
            MpvApi? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync(@"TestWallpapers\playlist.txt");
            var res = _player.GetPath();
            _player.Quit();

            Assert.IsNotNull(res);
        }
        [TestMethod]
        public async Task TestLoadList()
        {
            MpvApi? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync();
            var res = _player.LoadList(@"TestWallpapers\playlist.txt");
            _player.Quit();
        }

        [TestMethod]
        public async Task TestLoadFile()
        {
            MpvApi? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync();
            _player.LoadFile(@"TestWallpapers\audio.mp4");
            _player.Quit();
        }

        [TestMethod]
        public async Task TestGetSnapshot()
        {
            MpvApi? _player = GetPlayer();
            Assert.IsNotNull(_player);
            await _player.LaunchAsync();
            string videoFile = @"TestWallpapers\audio.mp4";
            _player.LoadFile(videoFile);
            var snapshot = new MpvPlayerSnapshot()
            {
                IPCServerName = _player.IPCServerName,
                PId = _player.Process?.Id,
                ProcessName = _player.Process?.ProcessName
            };

            //从快照恢复player
            _player = GetPlayer(snapshot);
            Assert.IsNotNull(_player);

            var res = _player.GetPath();
            Assert.IsTrue(res == videoFile);
            _player.Quit();
        }

        private MpvApi? GetPlayer(MpvPlayerSnapshot? snapshot = null)
        {
            string fullpath = Path.GetFullPath("../../../../../../giantapp-wallpaper-client/Client/Assets/Player/mpv.exe");
            MpvApi.PlayerPath = fullpath;
            return new MpvApi(snapshot?.IPCServerName, snapshot?.PId, snapshot?.ProcessName);
        }
    }
}
