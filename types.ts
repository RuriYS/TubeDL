export interface Format {
    itag: number;
    mimeType: string;
    bitrate: number;
    width: number;
    height: number;
    lastModified: string;
    quality: string;
    fps: number;
    qualityLabel: string;
    projectionType: string;
    audioQuality: string;
    approxDurationMs: string;
    audioSampleRate: string;
    audioChannels: number;
    signatureCipher: string;
}
