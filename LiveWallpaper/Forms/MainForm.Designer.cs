
namespace LiveWallpaper.Forms
{
    partial class MainForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(MainForm));
            this.webView2 = new Microsoft.Web.WebView2.WinForms.WebView2();
            this.panel_tips = new System.Windows.Forms.Panel();
            this.label_tips = new System.Windows.Forms.Label();
            this.webview2link = new System.Windows.Forms.LinkLabel();
            ((System.ComponentModel.ISupportInitialize)(this.webView2)).BeginInit();
            this.panel_tips.SuspendLayout();
            this.SuspendLayout();
            // 
            // webView2
            // 
            this.webView2.CreationProperties = null;
            this.webView2.DefaultBackgroundColor = System.Drawing.Color.White;
            this.webView2.Dock = System.Windows.Forms.DockStyle.Fill;
            this.webView2.Location = new System.Drawing.Point(0, 0);
            this.webView2.Margin = new System.Windows.Forms.Padding(4);
            this.webView2.Name = "webView2";
            this.webView2.Size = new System.Drawing.Size(1425, 858);
            this.webView2.TabIndex = 0;
            this.webView2.ZoomFactor = 1D;
            // 
            // panel_tips
            // 
            this.panel_tips.Anchor = System.Windows.Forms.AnchorStyles.None;
            this.panel_tips.Controls.Add(this.label_tips);
            this.panel_tips.Controls.Add(this.webview2link);
            this.panel_tips.Location = new System.Drawing.Point(307, 282);
            this.panel_tips.Name = "panel_tips";
            this.panel_tips.Size = new System.Drawing.Size(804, 222);
            this.panel_tips.TabIndex = 2;
            // 
            // label_tips
            // 
            this.label_tips.Location = new System.Drawing.Point(107, 56);
            this.label_tips.Name = "label_tips";
            this.label_tips.Size = new System.Drawing.Size(572, 66);
            this.label_tips.TabIndex = 3;
            this.label_tips.Text = "本功能需要微软最新的webview2运行时支持，请手动安装后，重新打开本窗口";
            this.label_tips.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // webview2link
            // 
            this.webview2link.Anchor = System.Windows.Forms.AnchorStyles.None;
            this.webview2link.Location = new System.Drawing.Point(107, 134);
            this.webview2link.Name = "webview2link";
            this.webview2link.Size = new System.Drawing.Size(589, 20);
            this.webview2link.TabIndex = 2;
            this.webview2link.TabStop = true;
            this.webview2link.Text = "https://developer.microsoft.com/microsoft-edge/webview2#download-section";
            this.webview2link.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            this.webview2link.LinkClicked += new System.Windows.Forms.LinkLabelLinkClickedEventHandler(this.Webview2link_LinkClicked);
            // 
            // MainForm
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(9F, 20F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(1425, 858);
            this.Controls.Add(this.panel_tips);
            this.Controls.Add(this.webView2);
            this.Icon = ((System.Drawing.Icon)(resources.GetObject("$this.Icon")));
            this.Margin = new System.Windows.Forms.Padding(4);
            this.Name = "MainForm";
            this.Text = "MainForm";
            ((System.ComponentModel.ISupportInitialize)(this.webView2)).EndInit();
            this.panel_tips.ResumeLayout(false);
            this.ResumeLayout(false);

        }

        #endregion

        private Microsoft.Web.WebView2.WinForms.WebView2 webView2;
        private System.Windows.Forms.Panel panel_tips;
        private System.Windows.Forms.Label label_tips;
        private System.Windows.Forms.LinkLabel webview2link;
    }
}