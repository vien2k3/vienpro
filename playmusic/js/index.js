
window.onload = function () {
    // Danh sách nhạc local
    const PLAY_LIST = [
      {
        title: "Nothin' on Me - Leah Marie Perez",
        url: "./nhac/baihat1.mp3",
        cover: "./images/cover1.png",
        lrc: "./lrc/baihat1.lrc"
      },
      {
        title: "Melanie Martinez - Play Date ",
        url: "./nhac/baihat2.mp3",
        cover: "./images/cover2.png",
        lrc: "./lrc/baihat2.lrc"
      }
    ];
    
    if (!PLAY_LIST) return alert('Không thể tải thông tin bài hát!');
  
    // Chọn ngẫu nhiên một bài hát
    let i = Math.floor(Math.random() * PLAY_LIST.length);
  
    // Khởi tạo hình nền
    dv = new DomVisual([
      './images/cover1.png',
      './images/cover2.png',
    ]);
    
    // Khởi tạo Audio
    av = new AudioVisual();
    av.onended = playNext;
  
    // Đăng ký sự kiện
    eventBus.on('play', () => {
      av.source ? av.togglePlay() : av.play(PLAY_LIST[i], false);
    });
    eventBus.on('prev', playPrev);
    eventBus.on('next', playNext);
  
    // Phát bài trước
    function playPrev() {
      i -= 1;
      if (i < 0) i = PLAY_LIST.length - 1;
      av.play(PLAY_LIST[i]);
    }
  
    // Phát bài tiếp theo
    function playNext() {
      i += 1;
      if (i >= PLAY_LIST.length) i = 0;
      av.play(PLAY_LIST[i]);
    }
    
    // Dự phòng sử dụng HTML5 Audio
    const audioFallback = document.createElement('audio');
    audioFallback.id = 'audio-fallback';
    document.body.appendChild(audioFallback);
    
    audioFallback.addEventListener('error', function(e) {
      console.error('Lỗi phát nhạc:', e);
      alert('Không thể phát file nhạc. Vui lòng đảm bảo các file nhạc đã được đặt vào thư mục nhac/.');
    });
  }
  
  // Event Bus
  const eventBus = {
    events: {},
    on(event, fn) {
      if (!this.events[event]) {
        this.events[event] = [];
      }
      this.events[event].push(fn);
    },
    emit() {
      let e = this.events[[].shift.call(arguments)];
      if (!e || e.length < 1) return;
      e.forEach(fn => {
        fn.apply(this, arguments);
      });
    }
  }; 
  