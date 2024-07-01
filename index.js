var Inline = Quill.import('blots/inline');
document.addEventListener('DOMContentLoaded', (event) => {
    const quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            // toolbar: [
            //     ['bold', 'italic', 'underline'],
            //     ['link', 'image', 'video']
            // ]
        }
    });
    if(localStorage.getItem('edit') === 'true'){
        const data = localStorage.getItem('editor');
        const delta = quill.clipboard.convert(data);
        quill.setContents(delta, 'silent');
        localStorage.removeItem('edit');
    }



    class ButtonBlot extends Inline {
        static create(value) {
            let node = super.create();
            node.setAttribute('contenteditable', false);
            node.style.display = 'inline';
            node.innerHTML = value.text
            node.setAttribute('video-id', value.videoId)
            node.setAttribute('video-timestamp', value.timestamp)
            node.addEventListener('click', () => playVideo(value.videoId, value.timestamp))
            return node;
            // let node = super.create();
            // node.setAttribute('contenteditable', false);
            // node.innerHTML = '<button id="custom-button-in-editor">Click me</button>';
            // node.querySelector('button').addEventListener('click', function () {
            //     alert('Button inside editor clicked!');
            // });
            // return node;
        }
        static value(node) {
            return node.innerHTML;
        }
    }
    ButtonBlot.blotName = 'button';
    ButtonBlot.tagName = 'button';
    ButtonBlot.className = 'custom-button';
    Quill.register(ButtonBlot);


    quill.clipboard.addMatcher(Node.ELEMENT_NODE, function (node, delta) {
        if (node.tagName === 'IFRAME' && node.src.startsWith('https://www.youtube.com/embed/')) {
            return delta.compose({ video: node.src });
        }
        return delta;
    });

    quill.clipboard.addMatcher(Node.TEXT_NODE, function (node, delta) {
        const regex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:&t=|\?t=)?(\d+)?)/g;
        const matches = [...node.data.matchAll(regex)];

        if (matches.length > 0) {
            delta.ops = []; // Clear existing ops
            let remainingText = node.data;

            matches.forEach((match) => {
                const parts = remainingText.split(match[0]);
                if (parts[0]) {
                    delta.insert(parts[0]);
                }

                const videoId = match[2];
                const timestamp = match[3];

                if (timestamp) {
                      const minutes = Math.floor(timestamp / 60);
                      const seconds = timestamp % 60;
                      const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      const linkText = `${timeText}`;
                    const range = quill.getLength();
                    quill.insertEmbed(range, 'button', {text:linkText, videoId, timestamp });

                    //   delta.insert({ text: linkText, attributes: { 'class': 'youtube-timestamp', 'data-video-url': videoUrl, 'data-timestamp': timestamp, link: 'https://www.google.com' } });
                } else {
                    const videoEmbed = `https://www.youtube.com/embed/${videoId}`;
                    delta.insert({ video: videoEmbed });
                }

                remainingText = parts.slice(1).join(match[0]);
            });

            if (remainingText) {
                delta.insert(remainingText);
            }
        }
        return delta;
    });

    document.querySelector('#editor-container').addEventListener('click', (event) => {
        if (event.target.classList.contains('youtube-timestamp')) {
            const videoUrl = event.target.getAttribute('data-video-url');
            const timestamp = event.target.getAttribute('data-timestamp');
            playVideo(videoUrl, timestamp);
        }
    });

    function playVideo(videoId, timestamp) {
        const iframe = document.getElementById("external-player");
        const url = `https://www.youtube.com/embed/${videoId}?start=${timestamp}&autoplay=1`
        iframe.src = url;
    }
});
function handleSave(){
    const editor = document.getElementById('editor')
    localStorage.setItem('editor', editor.innerHTML);
}