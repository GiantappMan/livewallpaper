export default function processFile(file: File, onProgress: (progress: number) => void, controller: AbortController): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target) {
                reject(new Error('事件中找不到目标'));
                return;
            }
            try {
                const contents = new Uint8Array(e.target.result as ArrayBuffer);
                if (contents) {
                    let binaryString = '';
                    const chunkSize = 50000; // 防止堆栈溢出的块大小
                    let i = 0; // 在函数外部初始化以跟踪进度
                    let lastReportedProgress = 0; // 上次报告的进度

                    const processChunk = () => {
                        if (controller.signal.aborted) {
                            reject(new Error('Processing aborted'));
                            return;
                        }

                        const start = i;
                        const end = Math.min(i + chunkSize, contents.length);
                        const subArray = Array.from(contents.subarray(start, end));
                        binaryString += String.fromCharCode.apply(null, subArray);
                        i += chunkSize;

                        // 计算并报告进度
                        const progress = i / contents.length * 100;
                        //变化大于一才触发
                        if (Math.floor(progress) > Math.floor(lastReportedProgress)) {
                            onProgress(progress);
                            lastReportedProgress = progress;
                        }

                        if (i < contents.length) {
                            // 如果还有更多要处理的，安排下一个块
                            setTimeout(processChunk, 0);
                        } else {
                            // 否则，完成处理
                            let base64String = btoa(binaryString);
                            resolve(base64String);
                        }
                    }

                    // 开始处理
                    processChunk();
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.readAsArrayBuffer(file);

        controller.signal.addEventListener('abort', () => {
            reader.abort();
            reject(new Error('导入已中止'));
        });
    });
}
