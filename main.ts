import express from 'express';
import ffmpeg from 'ffmpeg-static';
import cp from 'node:child_process';
import ytdl from '@distube/ytdl-core';
import path from 'node:path';
import { Format } from './types.ts';

const app = express();
const port = 4000;

app.use('/static', express.static('static'));

app.use(
    (
        req: { hostname: string },
        res: { redirect: (arg0: number, arg1: string) => void },
        next: () => void
    ) => {
        if (req.hostname === 'tubedl-dl.replit.app') {
            res.redirect(301, 'https://tubedl.ruriyoshinova.dev');
        } else {
            next();
        }
    }
);

app.get('/', (_req, res) => {
    res.set({
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Opener-Policy': 'same-origin',
    });
    res.sendFile(path.join(import.meta.dirname, 'index.html'));
});

app.get('/info', (req, res) => {
    const url = req.query.url;

    // const verify = (s: string) => {
    //     return /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)\w+$/.test(
    //         s
    //     );
    // };

    // if (!verify(url)) {
    //     return res.status(400).send();
    // }

    console.log(`[INFO] Request Received: ${url}`);

    try {
        if (!url) {
            res.status(400).send();
            return;
        }

        ytdl.getBasicInfo(url as string).then((info) => {
            // return res.send(info);
            const thumbnail = info.videoDetails.thumbnails
                .sort((a, b) => {
                    return b.width - a.width;
                })
                .pop();

            const _formats = (info.player_response.streamingData
                .adaptiveFormats ??
                info.player_response.streamingData.formats) as Format[];

            const formats = _formats
                .filter((format) => format.mimeType!.startsWith('video/mp4'))
                .sort((a, b) => {
                    if (b.height === a.height) {
                        // If heights are the same, sort by bitrate in descending order
                        return b.bitrate! - a.bitrate!;
                    }
                    // Otherwise, sort by height in descending order
                    return b.height! - a.height!;
                })
                .map((format) => {
                    return {
                        itag: format.itag,
                        qualityLabel: format.qualityLabel,
                        mimeType: format.mimeType,
                        bitrate: format.bitrate,
                        height: format.height,
                        width: format.width,
                    };
                });

            const payload = {
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds,
                uploadDate: info.videoDetails.uploadDate,
                thumbnail: thumbnail!.url,
                videoId: info.videoDetails.videoId,
                formats: formats,
                data: info,
            };
            res.status(200).send(payload);
        });
    } catch (error) {
        console.log(error);
        res.status(500).send();
    }
});

app.get('/download', (req, res) => {
    const url = req.query.url;
    try {
        if (!url) {
            res.status(400).send();
            return;
        }

        // const formatVal = req.query.format || null;
        // const ext = req.query.ext || 'mp4';
        const itag = req.query.id || null;

        if (!itag) return res.status(405).send();

        ytdl.getInfo(url as string).then((info) => {
            let videoStream;
            const audioStream = ytdl.downloadFromInfo(info, {
                quality: 'highestaudio',
            });

            const videoFormat = info.formats.find((format) => {
                return format.itag == parseInt(itag.toString());
                // return format.hasVideo && format.container === ext && format.qualityLabel === formatVal;
            });

            if (!videoFormat) {
                videoStream = ytdl.downloadFromInfo(info, {
                    quality: 'highestvideo',
                });
            } else {
                videoStream = ytdl.downloadFromInfo(info, {
                    format: videoFormat,
                });
            }

            try {
                const ffmpegProcess = cp.spawn(
                    ffmpeg,
                    [
                        '-i',
                        `pipe:3`,
                        '-i',
                        `pipe:4`,
                        '-map',
                        '0:v',
                        '-map',
                        '1:a',
                        '-c:v',
                        'copy',
                        '-c:a',
                        'libmp3lame',
                        '-crf',
                        '27',
                        '-preset',
                        'veryfast',
                        '-movflags',
                        'frag_keyframe+empty_moov',
                        '-f',
                        'mp4',
                        '-loglevel',
                        'error',
                        '-',
                    ],
                    {
                        stdio: ['pipe', 'pipe', 'pipe', 'pipe', 'pipe'],
                    }
                );
                videoStream.pipe(ffmpegProcess.stdio[3]);
                audioStream.pipe(ffmpegProcess.stdio[4]);

                const thumbnail = info.videoDetails.thumbnails.sort((a, b) => {
                    return b.width - a.width;
                })[0];

                res.header('Content-Type', 'video/mp4');
                res.header(
                    'Content-Disposition',
                    `attachment; filename="${encodeURIComponent(
                        info.videoDetails.title
                    )}_${info.videoDetails.videoId}.mp4"`
                );
                res.header(
                    'X-Video-Title',
                    `${encodeURIComponent(info.videoDetails.title)}`
                );
                res.header(
                    'X-Video-Upload-Date',
                    `${info.videoDetails.uploadDate}`
                );
                res.header(
                    'X-Video-Duration',
                    `${info.videoDetails.lengthSeconds}`
                );
                res.header('X-Video-ID', `${info.videoDetails.videoId}`);
                res.header('X-Video-Thumbnail', `${thumbnail.url}`);

                ffmpegProcess.stdio[1].pipe(res);
                console.log('Done sending buffer');
                return;
            } catch (error) {
                console.log(error);
                res.status(500).send('Server Error');
            }
        });
    } catch (error) {
        console.log(error);
        res.status(500).send();
    }
});

if (import.meta.main) {
    app.listen(port, () => {
        console.log(`Server Online (${port})`);
    });
}
