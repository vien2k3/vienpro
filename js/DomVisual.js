
class DomVisual {
    constructor (bgs) {
      this.domTextMap = new Map()
      this.domControlMap = new Map()
      this.domContainerMap = new Map()
  
      // Cache lời bài hát
      this.lyricsCache = {}
  
      this.domTextSelector = [
        '#song-title',
        '#info-state', '#info-duration', '#info-current-time',
        '#time-minute', '#time-second',
      ]
      
      this.domControlSelector = [
        {
          selector: '#playBtn',
          event: {
            click: () => {
              this.removePlayAnimation()
              eventBus.emit('play')
            }
          }
        },
        {
          selector: '#prevBtn',
          event: {
            click: () => {
              this.removePlayAnimation()
              eventBus.emit('prev')
            }
          }
        },
        {
          selector: '#nextBtn',
          event: {
            click: () => {
              this.removePlayAnimation()
              eventBus.emit('next')
            }
          }
        }
      ]
      this.domContainerSelector = ['#bg', '#info-cover', '#music-lrc']
      
      this.af = null
      this.bgs = bgs || []
      this.lrcList = []
      this.lrcIndex = 0
      this.lrcRowH = 30
      this.findDom('domTextSelector', 'domTextMap')
      this.findDom('domControlSelector', 'domControlMap')
      this.findDom('domContainerSelector', 'domContainerMap')
      this.handleInit()
      this.handleChange()
      this.loadBG()
      this.initEvents()
    }
  
    removePlayAnimation (dom) {
      let d = dom || this.getControlDom('#playBtn')
      if (d.classList.contains('animation')) {
        d.classList.remove('animation')
      }
    }
  
    handleChange () {
      eventBus.on('change', ({ state, duration, currentTime }) => {
        this.setDomText('#info-state', state)
        let durationFormat = parseFloat(duration).toFixed(2)
        let currentTimeFormat = parseFloat(currentTime).toFixed(2)
        if (isNaN(duration) || isNaN(currentTimeFormat)) {
          this.setDomText('#info-duration', duration)
          this.setDomText('#info-current-time', currentTime)
          this.setDomText('#time-minute', '00')
          this.setDomText('#time-second', '00')
          
          // Đặt lại thanh tiến trình về 0
          this.updateProgressBar(0);
        } else {
          this.setDomText('#info-duration', durationFormat)
          this.setDomText('#info-current-time', currentTimeFormat)
          let remainTime = parseInt(duration - currentTime)
          this.setDomText('#time-minute', this.add0(Math.max(Math.floor(remainTime / 60), 0)))
          this.setDomText('#time-second', this.add0(Math.max(remainTime % 60, 0)))
          
          // Cập nhật thanh tiến trình
          const progressPercent = (currentTime / duration);
          this.updateProgressBar(progressPercent);
          
          // Kiểm tra để cập nhật lời bài hát chính xác
          this.updateLyrics(currentTime);
        }
      })
    }
  
    handleInit () {
      eventBus.on('init', ({ title, cover, lrc }) => {
        this.initSongInfo ({ title, cover })
        this.loadData (lrc)
      })
    }
  
    findDom (domSelector, domMap) {
      if (this[domSelector].length < 1) return
      if (!this[domMap]) return
      this[domSelector].forEach(selector => {
        let type = Object.prototype.toString.call(selector)
        if (type === '[object String]') {
          this[domMap].set(selector, document.querySelector(selector))
        }
        if (type === '[object Object]') {
          let dom = document.querySelector(selector.selector)
          if (!dom) return
          this[domMap].set(selector.selector, dom)
          if (selector.event && Object.keys(selector.event).length > 0) {
            for (let key in selector.event) {
              dom.addEventListener(key, selector.event[key])
            }
          }
        }
      })
    }
  
    setDomText (selector, value) {
      let dom = this.domTextMap.get(selector)
      if (!dom) return
      dom.innerText = value
    }
  
    getContainerDom (selector) {
      return this.getDom(selector, this.domContainerMap)
    }
  
    getControlDom (selector) {
      return this.getDom(selector, this.domControlMap)
    }
  
    getDom (selector, domMap) {
      return domMap.get(selector) || null
    }
  
    initSongInfo ({ title, cover }) {
      this.lrcList = []
      this.lrcIndex = 0
      this.setDomText('#song-title', title)
      this.setDomText('#info-state', 'undefined')
      this.setDomText('#info-duration', '00.00')
      this.setDomText('#info-current-time', '00.00')
      this.setDomText('#time-minute', '00')
      this.setDomText('#time-second', '00')
      
      // Kiểm tra xem cover có phải đường dẫn hoàn chỉnh không
      if (!cover.startsWith('http') && !cover.startsWith('data:')) {
        try {
          // Thử tải hình ảnh từ đường dẫn local
          let img = new Image();
          img.onload = () => {
            this.getContainerDom('#info-cover').style = `background-image: url(${cover});`;
          };
          img.onerror = () => {
            console.warn(`Không thể tải hình ảnh: ${cover}`);
            this.getContainerDom('#info-cover').style = `background-image: url(./images/default.jpg);`;
          };
          img.src = cover;
        } catch (error) {
          console.error('Lỗi khi tải hình ảnh:', error);
          this.getContainerDom('#info-cover').style = `background-image: url(./images/default.jpg);`;
        }
      } else {
        this.getContainerDom('#info-cover').style = `background-image: url(${cover});`;
      }
    }
  
    loadBG () {
      // Không cần tải hình nền nữa vì đã sử dụng video
      console.log('Sử dụng video nền');
      
      // Kiểm tra xem video có tồn tại không
      const bgVideo = document.getElementById('bg-video');
      if (bgVideo) {
        // Đảm bảo video đang phát
        bgVideo.play().catch(error => {
          console.warn('Không thể tự động phát video nền:', error);
        });
      } else {
        console.warn('Không tìm thấy video nền');
      }
    }
  
    async loadData (url) {
      if (!url) {
        console.log('Không có URL cho file lời bài hát');
        this.lrcList = [[0, 'Đang phát file nhạc local, không có lời bài hát']];
        this.initLrcDom();
        return;
      }
      
      console.log('Đang tải file lời bài hát từ:', url);
      
      // Kiểm tra cache trước
      if (this.lyricsCache[url]) {
        console.log('Sử dụng lời bài hát từ cache');
        this.lrcList = this.lyricsCache[url];
        this.initLrcDom();
        return;
      }
      
      // Fix đường dẫn nếu cần thiết
      let fixedUrl = url;
      if (url.startsWith('./')) {
        // Thêm đường dẫn tương đối đến thư mục gốc nếu cần
        console.log('Đường dẫn ban đầu:', url);
        
        // Nếu không tìm thấy file ở vị trí hiện tại, thử đường dẫn khác
        if (url.includes('/lrc/')) {
          // Thử sửa lại đường dẫn, ví dụ: "./lrc/tiengtrung.lrc" -> "nhạcmới/lrc/tiengtrung.lrc"
          fixedUrl = url.replace('./lrc/', './nhạcmới/lrc/');
          console.log('Thử với đường dẫn mới:', fixedUrl);
        }
      }
      
      console.log('Đang tải file lời bài hát từ:', fixedUrl);
      
      try {
        let list = [];
        if (fixedUrl.startsWith('http')) {
          // Tải từ URL
          console.log('Tải lời từ URL');
          const response = await fetch(fixedUrl);
          const text = await response.text();
          console.log('Nội dung lời bài hát:', text.substring(0, 100) + '...');
          if (text) {
            let lines = text.split('\n');
            for (let i = 0; i < lines.length; i++) {
              let row = lines[i];
              if (!row.includes('[')) continue;
              try {
                let chunk = row.replace('[', '').split(']');
                let timeStr = chunk[0].trim();
                let times = timeStr.split(':');
                let seconds = times[0] * 60 + parseFloat(times[1]);
                list.push([seconds, chunk[1].trim()]);
              } catch (err) {
                console.warn('Lỗi phân tích dòng:', row, err);
              }
            }
          }
        } else {
          // Thử cả hai đường dẫn: đường dẫn ban đầu và đường dẫn đã sửa
          console.log('Thử tải lời từ đường dẫn gốc và đường dẫn đã sửa');
          
          const loadFromPath = async (path) => {
            try {
              const response = await fetch(path);
              if (response.ok) {
                const text = await response.text();
                console.log(`Tải thành công từ ${path}`);
                console.log('Nội dung lời bài hát:', text.substring(0, 100) + '...');
                return text;
              }
              return null;
            } catch (error) {
              console.error(`Lỗi khi tải từ ${path}:`, error);
              return null;
            }
          };
          
          // Thử tải từ nhiều đường dẫn khác nhau
          const potentialPaths = [
            url,                              // Đường dẫn gốc
            fixedUrl,                         // Đường dẫn đã sửa
            url.replace('./lrc/', 'lrc/'),    // Không có ./ ở đầu
            url.replace('./', ''),            // Không có ./ ở đầu
            'nhạcmới' + url                   // Thêm thư mục gốc
          ];
          
          let lyrics = null;
          
          for (const path of potentialPaths) {
            console.log('Thử tải từ:', path);
            lyrics = await loadFromPath(path);
            if (lyrics) break;
          }
          
          if (lyrics) {
            let lines = lyrics.split('\n');
            for (let i = 0; i < lines.length; i++) {
              let row = lines[i];
              if (!row.includes('[')) continue;
              try {
                let chunk = row.replace('[', '').split(']');
                let timeStr = chunk[0].trim();
                let times = timeStr.split(':');
                let seconds = times[0] * 60 + parseFloat(times[1]);
                list.push([seconds, chunk[1].trim()]);
              } catch (err) {
                console.warn('Lỗi phân tích dòng:', row, err);
              }
            }
          } else {
            // Thử cách cuối cùng: import trực tiếp
            try {
              // Lấy tên file từ đường dẫn
              const fileName = url.split('/').pop();
              console.log('Thử tìm trực tiếp file:', fileName);
              
              // Thử một số đường dẫn cục bộ
              const basePaths = [
                './lrc/',
                'lrc/',
                'nhạcmới/lrc/',
                './nhạcmới/lrc/'
              ];
              
              for (const basePath of basePaths) {
                const fullPath = basePath + fileName;
                console.log('Thử đường dẫn:', fullPath);
                const lyricsText = await loadFromPath(fullPath);
                if (lyricsText) {
                  let lines = lyricsText.split('\n');
                  for (let i = 0; i < lines.length; i++) {
                    let row = lines[i];
                    if (!row.includes('[')) continue;
                    try {
                      let chunk = row.replace('[', '').split(']');
                      let timeStr = chunk[0].trim();
                      let times = timeStr.split(':');
                      let seconds = times[0] * 60 + parseFloat(times[1]);
                      list.push([seconds, chunk[1].trim()]);
                    } catch (err) {
                      console.warn('Lỗi phân tích dòng:', row, err);
                    }
                  }
                  break;
                }
              }
            } catch (importError) {
              console.error('Lỗi khi import trực tiếp:', importError);
            }
            
            // Nếu vẫn không có lời, thêm lời mặc định
            if (list.length === 0) {
              console.log('Không thể tìm thấy file lời bài hát, thêm lời mặc định');
              list.push([0, 'Đang phát file nhạc local']);
              list.push([5, 'Không thể tải file lời bài hát']);
              list.push([10, 'Hãy tận hưởng âm nhạc...']);
            }
          }
        }
        
        // Sắp xếp lời bài hát theo thời gian
        list.sort((a, b) => a[0] - b[0]);
        
        console.log('Số dòng lời bài hát đã tải:', list.length);
        this.lrcList = list;
        
        // Lưu vào cache
        if (list.length > 0 && url) {
          console.log('Lưu lời bài hát vào cache');
          this.lyricsCache[url] = list;
        }
        
        this.initLrcDom();
      } catch (error) {
        console.error('Lỗi tổng thể khi tải lời bài hát:', error);
        this.lrcList = [[0, 'Không thể tải lời bài hát']];
        this.initLrcDom();
      }
    }
  
    initLrcDom () {
      const { lrcIndex, lrcList } = this
      let lrcContainer = this.getContainerDom('#music-lrc')
      
      console.log('Đang tạo DOM cho lời bài hát');
      console.log('Tổng số dòng lời:', lrcList.length);
      
      // Xóa nội dung cũ
      lrcContainer.innerHTML = ""
      
      // Tạo các phần tử cho tất cả các dòng lời
      for (let i = 0; i < lrcList.length; i++) {
        const row = lrcList[i];
        const p = document.createElement('p');
        p.dataset.time = row[0];
        p.textContent = row[1];
        p.dataset.index = i; // Thêm chỉ số dòng để dễ debug
        
        lrcContainer.appendChild(p);
      }
      
      console.log('Đã tạo xong DOM lời bài hát, số phần tử:', lrcContainer.childElementCount);
      
      // Cuộn đến dòng lời hiện tại
      this.rollLrc();
    }
  
    currentLrc () {
      const { lrcIndex, lrcList } = this
      return lrcList[lrcIndex]
    }
  
    nextLrcTime () {
      const { lrcIndex, lrcList } = this
      let end = lrcList.length - 1
      let nextIndex = lrcIndex + 1
      if (nextIndex >= end || end < 0 ) return null
      
      // Trả về thời gian của dòng lời tiếp theo
      return lrcList[nextIndex][0]
    }
  
    nextLrc () {
      const { lrcIndex, lrcList } = this
      if (lrcIndex >= lrcList.length - 1) return
      
      console.log('Đang chuyển sang dòng lời tiếp theo:', lrcIndex + 1);
      
      // Cập nhật chỉ số
      this.lrcIndex = this.lrcIndex + 1
      
      // Cập nhật hiển thị lời bài hát
      this.updateLyricsDisplay();
    }
    
    add0 (n) {
      return n > 9 ? n : `0${n}`
    }
  
    rollLrc () {
      const { lrcIndex } = this
      let lrcContainer = this.getContainerDom('#music-lrc')
      
      // Kiểm tra xem lrcContainer có tồn tại hay không
      if (!lrcContainer) {
        console.error('Không tìm thấy container lời bài hát');
        return;
      }
      
      // Tìm phần tử dòng lời hiện tại
      const currentElement = document.querySelector(`#music-lrc p[data-index="${lrcIndex}"]`);
      if (!currentElement) {
        console.error('Không tìm thấy dòng lời hiện tại');
        return;
      }
      
      // Tính toán vị trí cuộn để dòng hiện tại ở giữa
      const containerHeight = lrcContainer.parentElement.offsetHeight || 150;
      const elementTop = currentElement.offsetTop;
      const elementHeight = currentElement.offsetHeight;
      
      // Đặt vị trí cuộn để dòng hiện tại ở giữa container
      const scrollY = elementTop - (containerHeight / 2) + (elementHeight / 2);
      
      console.log('Cuộn lời bài hát đến vị trí:', scrollY, 'px, dòng:', lrcIndex);
      
      // Áp dụng cuộn mượt
      lrcContainer.style.transform = `translateY(-${scrollY}px)`;
    }
  
    initEvents () {
      // Thêm sự kiện cho thanh tiến trình
      const progressBar = document.getElementById('music-progress');
      if (progressBar) {
        // Xử lý click
        progressBar.addEventListener('click', (e) => {
          this.handleProgressInteraction(e, progressBar);
        });
        
        // Xử lý touch trên thiết bị di động
        progressBar.addEventListener('touchstart', (e) => {
          e.preventDefault(); // Ngăn scroll
          this.handleProgressInteraction(e.touches[0], progressBar);
        });
        
        // Xử lý touch move
        progressBar.addEventListener('touchmove', (e) => {
          e.preventDefault();
          this.handleProgressInteraction(e.touches[0], progressBar);
        });
      }
      
      // Xử lý resize màn hình
      window.addEventListener('resize', () => {
        // Đảm bảo canvas được vẽ lại với kích thước phù hợp
        if (window.av) {
          window.av.resizeCavnas();
          window.av.draw();
        }
        
        // Tính toán lại vị trí cuộn lời bài hát
        this.rollLrc();
      });
    }
    
    handleProgressInteraction(pointer, progressBar) {
      const rect = progressBar.getBoundingClientRect();
      const clickX = pointer.clientX - rect.left;
      const percentClicked = (clickX / rect.width);
      
      // Giới hạn phần trăm từ 0-1
      const percent = Math.max(0, Math.min(1, percentClicked));
      
      console.log(`Đang tìm vị trí: ${percent * 100}%`);
      
      // Cập nhật thanh tiến trình ngay lập tức
      this.updateProgressBar(percent);
      
      let newTime = 0;
      
      // Lấy audio element hoặc source
      const audioElement = document.getElementById('audio-fallback');
      if (audioElement && !audioElement.paused) {
        newTime = audioElement.duration * percent;
        audioElement.currentTime = newTime;
      } else if (window.av && window.av.source && window.av.source.buffer) {
        const duration = window.av.source.buffer.duration;
        newTime = duration * percent;
        window.av.startTime = window.av.ac.currentTime - newTime;
      } else {
        console.log('Không tìm thấy phần tử audio hoặc source');
        return;
      }
      
      // Cập nhật ngay lời bài hát tương ứng với vị trí mới
      this.updateLyrics(newTime);
    }
  
    // Thêm phương thức mới để xử lý lyrics chính xác hơn
    updateLyrics(currentTime) {
      const { lrcIndex, lrcList } = this;
      
      // Nếu không có lời hoặc đã đến cuối
      if (!lrcList || lrcList.length === 0 || lrcIndex >= lrcList.length - 1) {
        return;
      }
      
      // Nếu thời gian hiện tại vượt qua thời gian của dòng lời tiếp theo
      const nextTime = this.nextLrcTime();
      if (nextTime !== null && currentTime >= nextTime) {
        console.log(`Thời gian hiện tại (${currentTime}) >= thời gian dòng tiếp theo (${nextTime})`);
        this.nextLrc();
      } 
      // Kiểm tra nếu thời gian bị tua lùi, cần tìm dòng lời phù hợp
      else if (lrcIndex > 0 && currentTime < lrcList[lrcIndex][0]) {
        console.log(`Thời gian hiện tại (${currentTime}) < thời gian dòng hiện tại (${lrcList[lrcIndex][0]}), đang tìm dòng phù hợp`);
        
        // Tìm dòng lời phù hợp với thời gian hiện tại
        let foundIndex = 0;
        for (let i = 0; i < lrcList.length - 1; i++) {
          if (currentTime >= lrcList[i][0] && currentTime < lrcList[i+1][0]) {
            foundIndex = i;
            break;
          }
        }
        
        // Nếu cần phải cập nhật lại dòng lời
        if (foundIndex !== lrcIndex) {
          console.log(`Cập nhật lại dòng lời: ${lrcIndex} -> ${foundIndex}`);
          this.lrcIndex = foundIndex;
          
          // Cập nhật lại hiển thị
          this.updateLyricsDisplay();
        }
      }
    }
    
    // Phương thức mới để cập nhật hiển thị lyrics
    updateLyricsDisplay() {
      const { lrcIndex } = this;
      
      // Cập nhật class cho tất cả các dòng lời
      const lrcElements = document.querySelectorAll('#music-lrc p');
      if (lrcElements && lrcElements.length > 0) {
        // Xóa class từ tất cả các dòng
        lrcElements.forEach(el => {
          el.classList.remove('current');
          el.classList.remove('previous');
          el.classList.remove('next');
        });
        
        // Thêm class 'current' cho dòng hiện tại
        const currentElement = document.querySelector(`#music-lrc p[data-index="${lrcIndex}"]`);
        if (currentElement) {
          currentElement.classList.add('current');
          
          // Thêm class cho các dòng trước và sau
          for (let i = 1; i <= 2; i++) {
            const prevElement = document.querySelector(`#music-lrc p[data-index="${lrcIndex - i}"]`);
            if (prevElement) {
              prevElement.classList.add('previous');
            }
            
            const nextElement = document.querySelector(`#music-lrc p[data-index="${lrcIndex + i}"]`);
            if (nextElement) {
              nextElement.classList.add('next');
            }
          }
        }
      }
      
      // Cuộn đến dòng lời hiện tại
      this.rollLrc();
    }
  
    // Cập nhật thanh tiến trình
    updateProgressBar(percent) {
      // Đảm bảo giá trị phần trăm nằm trong khoảng 0-1
      percent = Math.max(0, Math.min(1, percent));
      
      // Chuyển đổi thành phần trăm từ 0-100
      const percentValue = percent * 100;
      
      // Cập nhật thanh tiến trình
      const progressCurrent = document.querySelector('.progress-current');
      const progressHandle = document.querySelector('.progress-handle');
      
      if (progressCurrent) {
        progressCurrent.style.width = `${percentValue}%`;
      }
      
      if (progressHandle) {
        progressHandle.style.left = `${percentValue}%`;
      }
    }
  } 
  