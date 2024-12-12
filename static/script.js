function setProgress(value) {
    document.querySelector('.progress').style.width = value.toString();
}

document.addEventListener('DOMContentLoaded', () => {
    document
        .querySelector('.submitButton')
        .addEventListener('click', async function () {
            const urlInput = document.getElementById('inputUrl');
            const urlValue = urlInput.value;

            if (urlValue.trim() !== '') {
                urlInput.disabled = true;
                setProgress('50%');

                try {
                    await fetch(`http://localhost:4000/info?url=${urlValue}`)
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error(`Code: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then((data) => {
                            document.querySelector('.video-thumbnail').src =
                                data.thumbnail || null;
                            document.getElementById('video-title').textContent =
                                data.title || null;
                            document.getElementById(
                                'video-upload-date'
                            ).textContent =
                                'Uploaded at ' + data.uploadDate || null;

                            const durationInSeconds = data.duration;

                            const hours = Math.floor(durationInSeconds / 3600);
                            const minutes = Math.floor(
                                (durationInSeconds % 3600) / 60
                            );
                            const seconds = durationInSeconds % 60;

                            let durationText = '';

                            if (hours > 0) {
                                durationText +=
                                    hours + ' hour' + (hours !== 1 ? 's' : '');
                            }

                            if (minutes > 0) {
                                durationText +=
                                    (durationText.length > 0 ? ', ' : '') +
                                    minutes +
                                    ' minute' +
                                    (minutes !== 1 ? 's' : '');
                            }

                            if (seconds > 0) {
                                durationText +=
                                    (durationText.length > 0 ? ' and ' : '') +
                                    seconds +
                                    ' second' +
                                    (seconds !== 1 ? 's' : '');
                            }

                            document.getElementById(
                                'video-duration'
                            ).textContent = durationText + ' long';
                            document.getElementById('video-id').textContent =
                                'Video ID: ' + data.videoId;
                            document.querySelector(
                                '.result-container'
                            ).style.display = 'flex';
                            const downloads =
                                document.getElementById('downloads');
                            data.formats.forEach((format) => {
                                const option = document.createElement('option');
                                option.textContent = `${
                                    format.qualityLabel
                                }  ${Math.floor(format.bitrate / 1000)}Kbps  ${
                                    format.width
                                }x${format.height}`;
                                option.value = format.itag;
                                downloads.appendChild(option);
                            });
                        });
                } catch (error) {
                    urlInput.disabled = false;
                    setProgress('0%');
                    console.log(error);
                    return;
                }

                const selection = document.getElementById('downloads');
                if (selection.value) {
                    document
                        .getElementById('download-button')
                        .setAttribute(
                            'href',
                            `/download?url=${urlValue}&id=${selection.value}`
                        );
                }

                // document
                //     .querySelector('.downloadButton')
                //     .addEventListener('click', () => {
                //         const selection = document.getElementById('downloads');
                //         if (selection.value) {
                //             fetch(
                //                 `/download?url=${urlValue}&id=${selection.value}`,
                //                 {
                //                     method: 'GET',
                //                 }
                //             )
                //                 .then(async (response) => {
                //                     const contentDisposition =
                //                         response.headers.get(
                //                             'Content-Disposition'
                //                         );
                //                     let filename = '';

                //                     if (contentDisposition) {
                //                         const filenameMatch =
                //                             contentDisposition.match(
                //                                 /filename=(.+)$/
                //                             );
                //                         if (filenameMatch) {
                //                             filename = decodeURIComponent(
                //                                 filenameMatch[1].replace(
                //                                     /['"]/g,
                //                                     ''
                //                                 )
                //                             );
                //                         }
                //                     }

                //                     const blob = await response.blob();
                //                     return { blob, filename };
                //                 })
                //                 .then(({ blob, filename }) => {
                //                     const downloadLink =
                //                         document.createElement('a');
                //                     downloadLink.href =
                //                         URL.createObjectURL(blob);
                //                     downloadLink.download = filename;
                //                     document.body.appendChild(downloadLink);
                //                     downloadLink.click();
                //                     document.body.removeChild(downloadLink);

                //                     URL.revokeObjectURL(downloadLink.href);
                //                 })
                //                 .catch((error) => {
                //                     console.error('Download failed:', error);
                //                 });
                //         }
                //     });

                document.querySelector('.result-container').style.display =
                    'block';
                setProgress('100%');
                urlInput.disabled = false;

                setTimeout(() => setProgress('0%'), 2000);
            }
        });
});
