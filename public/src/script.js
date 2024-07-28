document.addEventListener("DOMContentLoaded", function () {
    const inputValue = document.getElementById('value');
    const btn = document.getElementById('btn');
    const url = '/download';

    btn.addEventListener('click', function (e) {
        e.preventDefault();
        const days = inputValue.value > 0 && inputValue.value <= 30 ? inputValue.value : 1;
        download(days);
    });

    async function download(days) {
        try {
            const response = await fetch(`${url}?startTs=${Date.now() - (24 * 60 * 60 * 1000 * days)}&endTs=${Date.now()}`, {
                method: 'GET',
                headers: {
                    "Content-Type": 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'TelemetryData.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error('Error downloading the file:', error);
        }
    }
});
