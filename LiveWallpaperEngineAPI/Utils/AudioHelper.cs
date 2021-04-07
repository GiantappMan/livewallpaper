using NAudio.CoreAudioApi;
using System;
using System.Collections.Generic;
using System.Text;

namespace Giantapp.LiveWallpaper.Engine.Utils
{
    public static class AudioHelper
    {
        static AudioHelper()
        {

        }
        public static int GetVolume(int pId)
        {
            var deviceEnumerator = new MMDeviceEnumerator();
            var device = deviceEnumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
            var sessions = device.AudioSessionManager.Sessions;
            for (int i = 0; i < sessions.Count; i++)
            {
                var sessionItem = sessions[i];
                if (sessionItem.GetProcessID == pId)
                {
                    int r = (int)(sessionItem.SimpleAudioVolume.Volume * 100);
                    return r;
                }
            }
            return 0;
        }

        public static void SetVolume(int pId, int v)
        {
            var deviceEnumerator = new MMDeviceEnumerator();
            var device = deviceEnumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
            var sessions = device.AudioSessionManager.Sessions;
            for (int i = 0; i < sessions.Count; i++)
            {
                var sessionItem = sessions[i];
                if (sessionItem.GetProcessID == pId)
                {
                    sessionItem.SimpleAudioVolume.Volume = v / 100;
                    break;
                }
            }
        }
    }
}
