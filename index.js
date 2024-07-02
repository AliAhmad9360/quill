var Inline = Quill.import('blots/inline');
document.addEventListener('DOMContentLoaded', (event) => {
  const quill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      // toolbar: [
      //     ['bold', 'italic', 'underline'],
      //     ['link', 'image', 'video']
      // ]
    },
    formats: ['button'],
    // Sanitize the content to allow specific tags
    // sanitize: {
    //     // List of allowed tags
    //     allowedTags: ['button'],
    //     // List of allowed attributes
    //     allowedAttributes: {
    //         button: ['class', 'type', 'video-url']
    //     }
    // }
  });


  const Inline = Quill.import('blots/inline');

  class ButtonBlot extends Inline {
    static create(value) {
      let node = super.create();
      node.setAttribute('class', 'custom-button');
      //   node.innerHTML = value.text;
      node.setAttribute('video-url', value.url); // Set custom attribute
      node.onclick = playVideo
      return node;
    }

    static formats(node) {
      return {
        // text: node.innerHTML,
        url: node.getAttribute('video-url') // Retrieve custom attribute
      };
    }
  }

  ButtonBlot.blotName = 'button';
  ButtonBlot.tagName = 'button';
  Quill.register(ButtonBlot);



  document.addEventListener('paste', (event) => {
    event.preventDefault();
    const contents = getQuillContents()
    quill.focus();
    let position = getAdjustedCursorPosition(quill.getSelection())
    var clipboardData = event.clipboardData || window.clipboardData;
    const copiedCotents = clipboardData.getData('Text');
    var dataToPaste = contents.substring(0, position) + copiedCotents + contents.substring(position);
    position += copiedCotents.length
    debugger
    const regex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)(?:&t=|\?t=)?(\d+)?)/g;
    // debugger
    var modifiedData = dataToPaste.replace(regex, match => {
      return `<button video-url="${match}">${getYouTubeTimestamp(match)}</button>`
    })
    modifiedData = modifiedData.replace(/\n/g, '<br>').replaceAll('</button>s', '</button>');
    const delta = quill.clipboard.convert(modifiedData);
    delta.ops = [...delta.ops,{insert: ' '}]
    quill.setContents(delta, 'silent');
    setTimeout(() => {
      quill.setSelection(position)
    }, 10)

  })
  document.addEventListener('copy', (event) => {
    event.preventDefault();
    const clipboardContent = getQuillContents();
    event.clipboardData.setData('text/plain', clipboardContent);
  })

  if (localStorage.getItem('edit') === 'true') {
    const data = localStorage.getItem('editor');
    const delta = quill.clipboard.convert(data);
    quill.setContents(delta, 'silent');
    localStorage.removeItem('edit');
  }
  function getQuillContents() {
    const selection = quill.getSelection();
    var clipboardContent;
    if (selection) {
      clipboardContent = quill.getContents(selection.index, selection.length);
    }
    else {
      clipboardContent = quill.getContents();
    }
    clipboardContent = JSON.parse(JSON.stringify(clipboardContent));
    clipboardContent = clipboardContent?.ops?.map((ops, index) => {
      if (clipboardContent?.ops?.length - 1 === index && ops.insert.endsWith("\n")) {
        ops.insert = ops.insert.slice(0, -1);

      }
      if (ops.attributes && ops.attributes.button) {
        const time = ops.insert;
        const newUrl = new URL(ops.attributes.button.url)
        newUrl.searchParams.delete('t');
        newUrl.searchParams.delete('start');
        newUrl.searchParams.append('t', convertTimeStamp(time));
        return newUrl.toString();
      }
      else if (typeof ops.insert === 'string') return ops.insert;
      else return ops
    }).join('');
    return clipboardContent
  }
  function getAdjustedCursorPosition(range) {
    let line = quill.getContents(0, range.index)
    let currentIndex = range.index;
    line = JSON.parse(JSON.stringify(line));
    line?.ops?.map(ops => {
      if(ops.attributes && ops.attributes.button) {
        currentIndex = currentIndex + ops.attributes.button.url.length - 5;
        currentIndex += `&t=${convertTimeStamp(ops.insert)}`.length;
      }
    })
    return currentIndex;
  }
});
function handleSave() {
  const editor = document.getElementById('editor')
  localStorage.setItem('editor', editor.innerHTML);
}
function getYouTubeTimestamp(url) {
  const urlObj = new URL(url);
  let timeParam = urlObj.searchParams.get('t') || urlObj.searchParams.get('start');

  if (!timeParam) {
    const match = urlObj.pathname.match(/t=([0-9]+m[0-9]+s|[0-9]+s?)/);
    if (match) timeParam = match[1];
  }

  if (!timeParam) return '00:00';

  let seconds = 0;
  if (timeParam.includes('m')) {
    const parts = timeParam.split('m');
    seconds += parseInt(parts[0], 10) * 60;
    if (parts[1]) seconds += parseInt(parts[1].replace('s', ''), 10);
  } else if (timeParam.includes('s')) {
    seconds += parseInt(timeParam.replace('s', ''), 10);
  } else {
    seconds += parseInt(timeParam, 10);
  }

  const minutes = Math.floor(seconds / 60);
  seconds = seconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
function playVideo(event) {
  const url = event.target.getAttribute('video-url');
  const time = convertTimeStamp(event.target.innerHTML);
  document.getElementById('external-player').setAttribute('src', `https://www.youtube.com/embed/${getYouTubeVideoId(url)}?start=${time}&autoplay=1`)
}
function convertTimeStamp(time) {
  const arr = time.split(':').reverse();
  var seconds = 0;
  const multiplier = [1, 60, 3600];
  arr.map((t, i) => { seconds = seconds + (t * multiplier[i]) })
  return seconds;
}
function getYouTubeVideoId(url) {
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}