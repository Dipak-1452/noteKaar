let keysPressed = {};

document.addEventListener("keydown", (event) => {
    keysPressed[event.key.toLowerCase()] = true; // Store pressed keys
    // Check if both "c" and "n" are pressed together
    if (keysPressed["c"] && keysPressed["n"]) {
        event.preventDefault(); // Prevent default actions
        createStickyNote();
    }
});

document.addEventListener("keyup", (event) => {
    delete keysPressed[event.key.toLowerCase()]; // Remove key when released
});



browser.runtime.onMessage.addListener((message) => {
    if (message.action === "create_note") {
        createStickyNote();
    }
});




const trackedNotes = new Map(); // Map to keep track of each note's tracking interval


let currentlyOpenSizePicker = null;

async function createStickyNote({ id, content = "", color = '#A7FFEB', position = { top: '100px', left: '100px' }, transform = { angle: 0, x: 0, y: 0 }, offset = { x: 0, y: 0 }, shape = 'square', size = 'M', isPinned = false, anchorEl = '', anchorSelector = "", anchorIndex = "", anchorText = "", anchorMatchMethod = "textContent", visible = true } = {}) {

    let cssText = await fetch(browser.runtime.getURL('style.css')).then(r => r.text());


    if (!document.querySelector('#sticky-note-style')) {
        let style = document.createElement('style');
        style.id = 'sticky-note-style';
        style.textContent = `
.S {
  width: 175px;
  height: 175px;
}

.M {
  width: 200px;
  height: 200px;
}

.L {
  width: 225px;
  height: 225px;
}

.XL {
  width: 250px;
  height: 250px;
}
`;
        document.head.appendChild(style);
    }



    let noteWrapper = document.createElement("div");

    noteWrapper.className = `noteWrapper ${size}`;
    noteWrapper.id = id || `noteWrapper${Date.now()}`;
    noteWrapper.style.position = "fixed";
    noteWrapper.style.zIndex = "999999";
    noteWrapper.style.minWidth = "150px";
    noteWrapper.style.minHeight = "150px";
    noteWrapper.style.top = position.top;
    noteWrapper.style.left = position.left;

    noteWrapper.dataset.angle = transform.angle;
    noteWrapper.dataset.translateX = transform.x;
    noteWrapper.dataset.translateY = transform.y;
    noteWrapper.dataset.offsetX = offset.x;
    noteWrapper.dataset.offsetY = offset.y;
    noteWrapper.dataset.pinned = isPinned;
    noteWrapper.dataset.anchorEl = anchorEl;
    noteWrapper.dataset.anchorSelector = anchorSelector;
    noteWrapper.dataset.anchorIndex = anchorIndex;
    noteWrapper.dataset.anchorText = anchorText;
    noteWrapper.dataset.anchorMatchMethod = anchorMatchMethod;


    noteWrapper.style.display = visible ? 'flex' : 'none';



    let shadow = noteWrapper.attachShadow({ mode: 'open' });

    let styleTag = document.createElement("style");
    styleTag.textContent = cssText;
    shadow.appendChild(styleTag);



    let noteCon = document.createElement("div");
    noteCon.className = `noteCon ${size}`;






    let note = document.createElement("div");
    note.className = `note ${shape} ${size}`;
    note.style.backgroundColor = color;
    note.dataset.shape = shape;
    note.dataset.size = size;
    note.dataset.color = color;


    let menu = document.createElement("div");
    menu.classList.add("menu");
    menu.style.backgroundColor = color;

    let menuIcon = document.createElement("span");
    menuIcon.classList.add("menuIcon");
    menuIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10" opacity="0.25" stroke-width="1" stroke="#000"/><path fill="#000" d="M8 13a1 1 0 1 0 0-2a1 1 0 0 0 0 2m4 0a1 1 0 1 0 0-2a1 1 0 0 0 0 2m4 0a1 1 0 1 0 0-2a1 1 0 0 0 0 2" stroke-width="1" stroke="#000"/></svg>
    `
    menuIcon.setAttribute("title", "view tools");


    const handleMenuIconClick = (event) => {
        event.stopPropagation();

        const menu = event.target.closest('.noteCon').querySelector('.menu');
        menu.classList.toggle('active');
    };

    menuIcon.addEventListener("click", handleMenuIconClick);


    const handleMenuClick = (event) => {
        event.stopPropagation();
    }

    menu.addEventListener("click", handleMenuClick);


    let pin = document.createElement("span");
    pin.classList.add("pin")
    pin.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 20 20"><path fill="#000" d="m4.774 15.287l-2.105 3.25l.224 1.063l1.06-.227l2.104-3.248a8.4 8.4 0 0 1-1.283-.838m8.912-1.135c.014-.029.023-.061.036-.092q.08-.174.138-.357q.007-.034.016-.064a5 5 0 0 0 .098-.408v-.021c.195-1.169-.145-2.473-.923-3.651l1.11-1.714c1.279.163 2.385-.159 2.917-.982c.923-1.423-.2-3.792-2.505-5.293C12.266.068 9.65.005 8.729 1.426c-.534.824-.378 1.967.293 3.073L7.91 6.213c-1.389-.233-2.716-.016-3.703.64q-.01.002-.017.008a4 4 0 0 0-.332.254c-.017.014-.037.027-.051.041a3 3 0 0 0-.271.272c-.02.024-.048.045-.067.07a3 3 0 0 0-.29.385c-1.384 2.133-.203 5.361 2.633 7.209c2.838 1.848 6.26 1.614 7.641-.519q.132-.203.233-.421m-.815-9.958c-.887-.577-1.32-1.487-.965-2.036c.354-.547 1.361-.522 2.246.055c.889.577 1.318 1.489.965 2.036s-1.358.522-2.246-.055"/></svg>
    `
    pin.setAttribute("title", "pin the note");


    const handlePinClick = (event) => {
        // const noteWrapper = event.target.getRootNode().host;
        const isPinned = noteWrapper.dataset.pinned !== "true";
        togglePin(noteWrapper, isPinned, pin);
    }

    pin.addEventListener("click", handlePinClick);


    pin.style.opacity = isPinned ? '1' : '0.5';
    if (isPinned) {
        anchorEl = findAnchorAgain(noteWrapper);
        startTrackingElement(noteWrapper, anchorEl);
    }




    let colorIcon = document.createElement("span");
    colorIcon.classList.add("colorIcon");
    colorIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5A1.5 1.5 0 0 1 14.5 5A1.5 1.5 0 0 1 16 6.5A1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5A1.5 1.5 0 0 1 9.5 5A1.5 1.5 0 0 1 11 6.5A1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5A1.5 1.5 0 0 1 6.5 9A1.5 1.5 0 0 1 8 10.5A1.5 1.5 0 0 1 6.5 12M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1c-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8"/></svg>
    `
    colorIcon.setAttribute("title", "pick the color");


    const handleColorIconClick = (event) => {
        event.stopPropagation();
        

        shapePicker.classList.remove('active');
        colorPicker.classList.toggle('active');
        sizePicker.classList.remove('active');
        confirmDel.classList.remove('active')
    }

    colorIcon.addEventListener('click', handleColorIconClick);


    let shapeIcon = document.createElement("span");
    shapeIcon.classList.add("shapeIcon");
    shapeIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M11 13.5v8H3v-8zm-2 2H5v4h4zM12 2l5.5 9h-11zm0 3.86L10.08 9h3.84zM17.5 13c2.5 0 4.5 2 4.5 4.5S20 22 17.5 22S13 20 13 17.5s2-4.5 4.5-4.5m0 2a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5"/></svg>
    `
    shapeIcon.setAttribute("title", "pick the shape");


    const handleShapeIconClick = (event) => {
        event.stopPropagation();
      

        shapePicker.classList.toggle('active');
        colorPicker.classList.remove('active');
        sizePicker.classList.remove('active');
        confirmDel.classList.remove('active')
    }

    shapeIcon.addEventListener('click', handleShapeIconClick);


    let deleteIcon = document.createElement("span");
    deleteIcon.classList.add("deleteIcon");
    deleteIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" fill-rule="evenodd" d="m6.774 6.4l.812 13.648a.8.8 0 0 0 .798.752h7.232a.8.8 0 0 0 .798-.752L17.226 6.4h1.203l-.817 13.719A2 2 0 0 1 15.616 22H8.384a2 2 0 0 1-1.996-1.881L5.571 6.4zM9.5 9h1.2l.5 9H10zm3.8 0h1.2l-.5 9h-1.2zM4.459 2.353l15.757 2.778a.5.5 0 0 1 .406.58L20.5 6.4L3.758 3.448l.122-.69a.5.5 0 0 1 .579-.405m6.29-1.125l3.94.695a.5.5 0 0 1 .406.58l-.122.689l-4.924-.869l.122-.689a.5.5 0 0 1 .579-.406z" stroke-width="0.8" stroke="#000"/></svg>
    `
    deleteIcon.setAttribute("title", "delete the note");


    const handleDeleteIconClick = (event) => {
       

        confirmDel.classList.toggle('active');
        shapePicker.classList.remove('active');
        colorPicker.classList.remove('active');
        sizePicker.classList.remove('active');
    }

    deleteIcon.addEventListener("click", handleDeleteIconClick);


    let confirmDel = document.createElement("div");
    confirmDel.classList.add("confirmDel");
    confirmDel.innerHTML = `
    <p>are you sure?</p>
    <div>
    <button id='cancelBtn'>Cancel</button>
    <button id='deleteBtn'>Delete</button>
    </div>
    `


    const handleConfirmDelClick = (event) => {
        event.stopPropagation();
    }

    confirmDel.addEventListener("click", handleConfirmDelClick);


    let deleteBtn = confirmDel.querySelector('#deleteBtn');
    let cancelBtn = confirmDel.querySelector('#cancelBtn');




    const handleDeleteBtnClick = async (event) => {

        stopTracking(noteWrapper);

        menuIcon.removeEventListener("click", handleMenuIconClick);
        menu.removeEventListener("click", handleMenuClick);
        pin.removeEventListener("click", handlePinClick);
        colorIcon.removeEventListener('click', handleColorIconClick);
        shapeIcon.removeEventListener('click', handleShapeIconClick);
        deleteIcon.removeEventListener("click", handleDeleteIconClick);
        confirmDel.removeEventListener("click", handleConfirmDelClick);
        deleteBtn.removeEventListener("click", handleDeleteBtnClick);
        cancelBtn.removeEventListener("click", handleCancelBtnClick);
        dashboardIcon.removeEventListener("click", handleDashboardIconClick);
        sizePicker.removeEventListener('click', handleSizePickerClick);
        sizes.forEach((sizeEl, i) => {
            sizeEl.removeEventListener('click', sizeClickHandlers[i]);
        })

        document.removeEventListener('wheel', handleDocumentWheel);
        document.removeEventListener('keydown', handleDocumentKeydown);
        resizeIcon.removeEventListener('click', handleResizeIconClick);
        textArea.removeEventListener('input', handleTextAreaInput);
        removeIcon.removeEventListener("click", handleRemoveIconClick);
        colorPicker.removeEventListener('click', handleColorPickerClick);

        colors.forEach((color, i) => {
            color.removeEventListener('click', colorClickHandlers[i]);
            color.removeEventListener('mouseenter', colorMouseenterHandlers[i]);
            color.removeEventListener('mouseleave', colorMouseleaveHandlers[i]);
        })

        shapePicker.removeEventListener('click', handleShapePickerClick);

        shapes.forEach((shape, i) => {
            shape.removeEventListener('click', shapeClickHandlers[i]);
            shape.removeEventListener('mouseenter', shapeMouseenterHandlers[i]);
            shape.removeEventListener('mouseleave', shapeMouseleaveHandlers[i]);
        })

        document.removeEventListener('click', handleDocumentClick);

        cleanupDrag();

        const noteId = noteWrapper.id;
        noteWrapper.remove(); // Remove from DOM

        // Remove from storage
        const result = await browser.storage.local.get("notes");
        const notes = result.notes || {};
        delete notes[noteId];
        await browser.storage.local.set({ notes });

        // console.log(`Note ${noteId} deleted permanently`);
        confirmDel.classList.remove('active');


        cssText = null;
        style = null;
        noteWrapper = null;
        shadow = null;
        styleTag = null;
        noteCon = null;
        note = null;
        menu = null;
        menuIcon = null;
        pin = null;
        colorIcon = null;
        shapeIcon = null;
        deleteIcon = null;
        confirmDel = null;
        deleteBtn = null;
        cancelBtn = null;
        dashboardIcon = null;
        resizeIcon = null;
        sizePicker = null;
        sizes = null;
        textArea = null;
        removeIcon = null;
        colorPicker = null;
        colors = null;
        shapePicker = null;
        shapes = null;
    }

    deleteBtn.addEventListener("click", handleDeleteBtnClick);


    const handleCancelBtnClick = (event) => {

        confirmDel.classList.remove('active');
    }

    cancelBtn.addEventListener("click", handleCancelBtnClick);





    let dashboardIcon = document.createElement("span");
    dashboardIcon.classList.add("dashboardIcon");
    dashboardIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.8"><path stroke="#000" d="M31.25 18.75v22.917m-25-22.917h37.5z"/><path stroke="#000" d="M41.667 6.25H8.333c-1.15 0-2.083.933-2.083 2.083v33.334c0 1.15.933 2.083 2.083 2.083h33.334c1.15 0 2.083-.933 2.083-2.083V8.333c0-1.15-.933-2.083-2.083-2.083"/></g></svg>
    `
    dashboardIcon.setAttribute("title", "go to dashboard");

    const handleDashboardIconClick = () => {
        browser.runtime.sendMessage({ action: "open_dashboard" });
    }

    dashboardIcon.addEventListener("click", handleDashboardIconClick);




    let resizeIcon = document.createElement("span");
    resizeIcon.classList.add("resizeIcon");
    resizeIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path fill="#000" d="M3.5 0L1 3h2v2H1l2.5 3L6 5H4V3h2z"/></svg>
    `
    resizeIcon.setAttribute("title", "resize the note");






    let sizePicker = document.createElement("div");
    sizePicker.classList.add("sizePicker");

    const handleSizePickerClick = (event) => {
        event.stopPropagation();
    }

    sizePicker.addEventListener('click', handleSizePickerClick);




    sizePicker.innerHTML = `
    <div class="size" data-size="XS"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M6 7h2l1 2.5L10 7h2l-2 5l2 5h-2l-1-2.5L8 17H6l2-5zm9 0h4v2h-4v2h2a2 2 0 0 1 2 2v2c0 1.11-.89 2-2 2h-4v-2h4v-2h-2a2 2 0 0 1-2-2V9c0-1.1.9-2 2-2"/></svg></div>
    <div class="size" data-size="S"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M11 7c-1.1 0-2 .9-2 2v2a2 2 0 0 0 2 2h2v2H9v2h4c1.11 0 2-.89 2-2v-2a2 2 0 0 0-2-2h-2V9h4V7z"/></svg></div>
    <div class="size" data-size="M"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M9 7c-1.1 0-2 .9-2 2v8h2V9h2v7h2V9h2v8h2V9a2 2 0 0 0-2-2z"/></svg></div>
    <div class="size" data-size="L"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M9 7v10h6v-2h-4V7z"/></svg></div>
    <div class="size" data-size="XL"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M6 7h2l1 2.5L10 7h2l-2 5l2 5h-2l-1-2.5L8 17H6l2-5zm7 0h2v8h4v2h-6z"/></svg></div>
    `


    let sizes = Array.from(sizePicker.querySelectorAll('.size'));
    let currentSizeIndex = sizes.findIndex(s => s.dataset.size === 'M');

    // Helper to apply size
    function applySize(index) {
        sizes.forEach(size => {
            size.style.backgroundColor = "";
            size.style.opacity = 1;
        })
        currentSizeIndex = index;
        const selectedSize = sizes[index].dataset.size;
        sizes[index].style.backgroundColor = "rgb(142, 118, 118)";
        sizes[index].style.opacity = 0.7;


        // Remove existing size classes
        ['XS', 'S', 'M', 'L', 'XL'].forEach(cls => {
            note.classList.remove(cls);
            noteCon.classList.remove(cls);
            noteWrapper.classList.remove(cls);
        });

        // Add selected class
        note.classList.add(selectedSize);
        noteCon.classList.add(selectedSize);
        noteWrapper.classList.add(selectedSize);

        note.dataset.size = selectedSize;
        saveNote(noteWrapper);
    }

    // Click handler
    const sizeClickHandlers = [];

    sizes.forEach((sizeEl, i) => {
        const handleSizeElClick = (event) => {
            applySize(i);


            sizePicker.classList.remove('active');

            currentlyOpenSizePicker = null;
        };

        sizeClickHandlers[i] = handleSizeElClick;
        sizeEl.addEventListener('click', handleSizeElClick);

    });

    // Scroll to switch size

    const handleDocumentWheel = (e) => {
        if (!sizePicker.classList.contains('active')) return;
        e.preventDefault();


        if (e.deltaY > 0) {
            // Scroll down → increase size
            if (currentSizeIndex < sizes.length - 1) currentSizeIndex++;
        } else {
            // Scroll up → decrease size
            if (currentSizeIndex > 0) currentSizeIndex--;
        }

        applySize(currentSizeIndex);
    }

    document.addEventListener('wheel', handleDocumentWheel, { passive: false });



    const handleDocumentKeydown = (e) => {
        if (!sizePicker.classList.contains('active')) return;

        if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault(); // Prevent default scrolling behavior
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            if (currentSizeIndex < sizes.length - 1) currentSizeIndex++;
            applySize(currentSizeIndex);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            if (currentSizeIndex > 0) currentSizeIndex--;
            applySize(currentSizeIndex);
        }
    }

    // Keyboard arrow keys to change size
    document.addEventListener('keydown', handleDocumentKeydown);



    const handleResizeIconClick = (event) => {
        event.stopPropagation();

        const noteCon = event.target.closest('.noteCon');

        const sizePicker = noteCon.querySelector('.sizePicker');

        if (currentlyOpenSizePicker && currentlyOpenSizePicker !== sizePicker) {
            currentlyOpenSizePicker.classList.remove('active');
        }

        const isActive = sizePicker.classList.toggle('active');
        shapePicker.classList.remove('active');
        colorPicker.classList.remove('active');
        confirmDel.classList.remove('active')

        currentlyOpenSizePicker = isActive ? sizePicker : null;

        currentSizeIndex = sizes.findIndex(s => s.dataset.size === note.dataset.size);
        applySize(currentSizeIndex); // Pre-select M
    }

    resizeIcon.addEventListener('click', handleResizeIconClick);








    // Create an editable text area
    let textArea = document.createElement("textarea");
    textArea.classList.add("note-text"); // Add class to textarea
    textArea.placeholder = "Take a note..."
    textArea.value = content;



    const handleTextAreaInput = (event) => {
        // const noteWrapper = event.target.getRootNode().host;

        saveNote(noteWrapper);
    }

    textArea.addEventListener('input', handleTextAreaInput);





    // Create a remove button
    let removeIcon = document.createElement("span");
    removeIcon.classList.add("removeIcon");
    // Add the Typicons delete icon as inline SVG
    removeIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M19.1 4.9C15.2 1 8.8 1 4.9 4.9S1 15.2 4.9 19.1s10.2 3.9 14.1 0s4-10.3.1-14.2m-4.3 11.3L12 13.4l-2.8 2.8l-1.4-1.4l2.8-2.8l-2.8-2.8l1.4-1.4l2.8 2.8l2.8-2.8l1.4 1.4l-2.8 2.8l2.8 2.8z"/></svg>
    `
    removeIcon.setAttribute("title", "hide the note");



    const handleRemoveIconClick = (event) => {
        const noteWrapper = event.target.getRootNode().host;

        noteWrapper.remove();
    }

    removeIcon.addEventListener("click", handleRemoveIconClick);


    let colorPicker = document.createElement("div");

    const handleColorPickerClick = (event) => {
        event.stopPropagation();
    }

    colorPicker.addEventListener('click', handleColorPickerClick);


    colorPicker.classList.add("colorPicker")
    colorPicker.innerHTML = `
    <div class="color" style="background-color: #F28B82" data-color="#F28B82"></div>
    <div class="color" style="background-color: #FBBC05;" data-color="#FBBC05"></div>
    <div class="color" style="background-color: #FFF475;" data-color="#FFF475"></div>
    <div class="color" style="background-color: #CCFF90;" data-color="#CCFF90"></div>
    <div class="color" style="background-color: #A7FFEB;" data-color="#A7FFEB"></div>
    <div class="color" style="background-color: #AECBFA;" data-color="#AECBFA"></div>
    <div class="color" style="background-color: #D7AEFB;" data-color="#D7AEFB"></div>
    <div class="color" style="background-color: #FDCFE8;" data-color="#FDCFE8"></div>
    <div class="color" style="background-color: #E6C9A8;" data-color="#E6C9A8"></div>
    <div class="color" style="background-color: #E8EAED;" data-color="#E8EAED"></div>
    `

    let colors = Array.from(colorPicker.querySelectorAll('.color'));
    let clicked = false;

    const colorClickHandlers = [];
    const colorMouseenterHandlers = [];
    const colorMouseleaveHandlers = [];

    colors.forEach((color, i) => {

        const handleColorClick = (e) => {
            clicked = true;
            const selectedColor = e.target.getAttribute('data-color');
            note.dataset.color = selectedColor;
            note.style.backgroundColor = selectedColor;
            menu.style.backgroundColor = selectedColor;

            colorPicker.classList.remove('active');

            saveNote(noteWrapper);

            setTimeout(() => clicked = false, 0);

        }
        colorClickHandlers[i] = handleColorClick;
        color.addEventListener('click', handleColorClick);



        const handleColorMouseenter = (e) => {
            const selectedColor = e.target.getAttribute('data-color');
            note.style.backgroundColor = selectedColor;
            menu.style.backgroundColor = selectedColor;
        }
        colorMouseenterHandlers[i] = handleColorMouseenter;
        color.addEventListener('mouseenter', handleColorMouseenter);



        const handleColorMouseleave = (e) => {

            if (clicked) return;

            note.style.backgroundColor = note.dataset.color;
            menu.style.backgroundColor = note.dataset.color;
        }

        colorMouseleaveHandlers[i] = handleColorMouseleave;
        color.addEventListener('mouseleave', handleColorMouseleave);


    })





    let shapePicker = document.createElement("div");


    const handleShapePickerClick = (event) => {
        event.stopPropagation();
    }

    shapePicker.addEventListener('click', handleShapePickerClick);




    shapePicker.classList.add("shapePicker");
    shapePicker.innerHTML = `
    <div class="shape" data-shape="square"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1"/></svg></div>
    <div class="shape" data-shape="heart"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 3C4.239 3 2 5.216 2 7.95c0 2.207.875 7.445 9.488 12.74a.99.99 0 0 0 1.024 0C21.126 15.395 22 10.157 22 7.95C22 5.216 19.761 3 17 3s-5 3-5 3s-2.239-3-5-3"/></svg></div>
    <div class="shape" data-shape="star"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#fff" d="M9.153 5.408C10.42 3.136 11.053 2 12 2s1.58 1.136 2.847 3.408l.328.588c.36.646.54.969.82 1.182s.63.292 1.33.45l.636.144c2.46.557 3.689.835 3.982 1.776c.292.94-.546 1.921-2.223 3.882l-.434.507c-.476.557-.715.836-.822 1.18c-.107.345-.071.717.001 1.46l.066.677c.253 2.617.38 3.925-.386 4.506s-1.918.051-4.22-1.009l-.597-.274c-.654-.302-.981-.452-1.328-.452s-.674.15-1.328.452l-.596.274c-2.303 1.06-3.455 1.59-4.22 1.01c-.767-.582-.64-1.89-.387-4.507l.066-.676c.072-.744.108-1.116 0-1.46c-.106-.345-.345-.624-.821-1.18l-.434-.508c-1.677-1.96-2.515-2.941-2.223-3.882S3.58 8.328 6.04 7.772l.636-.144c.699-.158 1.048-.237 1.329-.45s.46-.536.82-1.182z" stroke-width="1" stroke="#fff"/></svg></div>
    <div class="shape" data-shape="butterfly"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#fff" d="M59.42 54.76c-.38-1-9.26-17.5-29-28.2c-4.33-2.35-16.77-9.83-24.28-4.43c-5.67 3.47-.97 11.38 2.63 15.86c3.48 4.33 5.54 7.58 6.71 13.05c1.18 5.51 3.28 12.96 9.54 14.56c2.9.74 5.9-.12 8.75-.67c2.31-.45 6.28-1.69 6.91-.72c1.42 2.3-18.41 8.42-20.02 15.65c-1.92 8.62 3.15 11.81 6.83 16.23c3.44 4.66 1.59 8.96 6.08 10.96c5.86 2.6 12.9-2.11 15.83-6.76c4.39-6.98 5.06-11.52 8.34-19.06c1.1-2.53 3.27-7.89 4.09-10.53c.41-1.34.97-3.5.96-5.25c-.21-4.35-2.75-9.05-3.37-10.69"/><path fill="#fff" d="M48.92 44.89c-3.33-3.86-6.83-6.96-11.67-9.46c-2.03-1.05-8.14-.22-6.57 4.16c.83 2.32 9.01 7.16 12.01 9.16c4.65 3.1 14.05 11.35 14.73 10.95c1.86.3-5.15-10.93-8.5-14.81m-6.37 8.35c-2.94-2.18-6.48-4.69-10.33-4.48c-2.67.14-5.34 2.25-3.82 5.08c1.96 3.65 7.52 4.91 11.18 5.78c4.87 1.15 14.76 4.02 14.76 2.86c.24-1.15-8.44-6.76-11.79-9.24M28.36 29.15c-2.86.32-6.36 1.14-7.38 4.31c-.68 2.12.29 5.21 2.8 5.53c1.84.23 2.56-1.27 3.25-2.65c.87-1.75 2.39-2.8 3.67-4.21c1.98-2.17-.25-2.98-2.34-2.98M9.79 25.22c1.96-.92 3.48-.84 5.94-.38c1.11.21 4.25.89 4.55 2.28c.23 1.06-2.27 2.38-2.87 3.07c-.99 1.13-1.5 2.39-2.12 3.75c-1.01 2.21-4.73-2.04-5.12-2.62c-.51-.75-1.67-2.79-1.58-3.82c.06-.77.5-1.86 1.2-2.28m11.75 16.95c1.9.45 4.48.28 6.15 1.4c2.45 1.64-2.79 4.35-4.14 4.86c-5.34 2.01-9.54-7.01-7.87-9.78c1.34-2.28 3.82 3.04 5.86 3.52m-1.16 9.8c.93-1.36 5.45-1.15 4.98 1.94c-.45 3-4.23 4.85-5.33 1.22c-.33-1.08-.28-2.2.35-3.16m3.3 8.37c.45-1.82 6.7-3.42 7.37.31c.55 3.04-3.23 2.63-5.48 2.2c-1.47-.28-2.24-1.28-1.89-2.51"/><path fill="#fff" d="M54.18 69.81c1.3-2.73-10.58 3.96-14.2 7.48c-2.66 2.59-5.26 5.5-4.35 9.28c.27 1.13.89 2.37 2.09 2.68c1.28.33 2.57-.51 3.51-1.3c3.16-2.64 5.23-6.63 7.31-10.13c1.69-2.84 3.42-5.56 5.64-8.01m-6.54-.94c2.83-1.52-13.74.87-15.51 6.75c-.33 1.08-.19 2.46 1.26 1.95c1.96-.68 3.69-2.55 5.34-3.74c2.78-2 5.8-3.53 8.91-4.96m7 7c-1.89 3.38-3 4.9-5.41 8.26c-1.78 2.47-3.37 5.44-3.73 8.51c-.29 2.44 2.06 1.9 3.11.42c1.9-2.67 3.38-5.73 4.47-8.8c.96-2.75 3.25-10.76 1.56-8.39m-30.44 4.5c1.2-2.08 6.46-3.24 6.78.66c.23 2.85-1.48 4.71-4.07 4.52c-.97-.13-4.13-2.8-2.71-5.18m2.9 8.8c.14-1.32 2.2-1.52 3.59-1.29c1.24.21 1.8 1.28 1.44 2.45c-.32 1.06-.99 2.4-2.14 2.42c-1.34.03-2.89-2.07-2.89-3.58m7.19 4.86c1.04-1.22 4.92-2.73 6.09-.52c.87 1.65-.9 4.5-1.37 6.2c-.44 1.57-1.28 2.11-2.9 1.79c-1.58-.32-2.56-1.15-3.35-2.65c-.99-1.87.43-3.45 1.53-4.82m8.28 4.17c-.85.47-.99 2.06-.44 3.12c.51.99 1.8.75 2.55.21c.79-.57 1.54-1.82 1.02-2.8s-2.15-.91-3.13-.53"/><path fill="#fff" d="M68.58 54.76c.38-1 9.26-17.5 29-28.2c4.33-2.35 16.77-9.83 24.28-4.43c5.67 3.47.98 11.39-2.63 15.86c-3.48 4.33-5.54 7.58-6.71 13.05c-1.18 5.51-3.28 12.96-9.54 14.56c-2.9.74-5.9-.12-8.75-.67c-2.31-.45-6.28-1.69-6.91-.72c-1.42 2.3 18.41 8.42 20.02 15.65c1.92 8.62-3.15 11.81-6.83 16.23c-3.44 4.66-1.59 8.96-6.08 10.96c-5.86 2.6-12.9-2.11-15.83-6.76c-4.39-6.98-5.06-11.52-8.34-19.06c-1.1-2.53-3.27-7.89-4.09-10.53c-.41-1.34-.97-3.5-.96-5.25c.21-4.35 2.75-9.05 3.37-10.69"/><path fill="#fff" d="M79.08 44.89c3.33-3.86 6.83-6.96 11.67-9.46c2.03-1.05 8.14-.22 6.57 4.16c-.83 2.32-9.01 7.16-12.01 9.16c-4.65 3.1-14.05 11.35-14.73 10.95c-1.86.3 5.15-10.93 8.5-14.81m6.37 8.35c2.94-2.18 6.48-4.69 10.33-4.48c2.67.14 5.34 2.25 3.82 5.08c-1.96 3.65-7.52 4.91-11.18 5.78c-4.87 1.15-14.76 4.02-14.76 2.86c-.24-1.15 8.44-6.76 11.79-9.24m14.19-24.09c2.86.32 6.36 1.14 7.38 4.31c.68 2.12-.29 5.21-2.8 5.53c-1.84.23-2.56-1.27-3.25-2.65c-.87-1.75-2.39-2.8-3.67-4.21c-1.98-2.17.25-2.98 2.34-2.98m18.57-3.93c-1.96-.92-3.48-.84-5.94-.38c-1.11.21-4.25.89-4.55 2.28c-.23 1.06 2.27 2.38 2.87 3.07c.99 1.13 1.5 2.39 2.12 3.75c1.01 2.21 4.73-2.04 5.12-2.62c.51-.75 1.67-2.79 1.58-3.82c-.06-.77-.5-1.86-1.2-2.28m-11.75 16.95c-1.9.45-4.48.28-6.15 1.4c-2.45 1.64 2.79 4.35 4.14 4.86c5.34 2.01 9.54-7.01 7.87-9.78c-1.34-2.28-3.82 3.04-5.86 3.52m1.16 9.8c-.93-1.36-5.45-1.15-4.98 1.94c.45 3 4.23 4.85 5.33 1.22c.33-1.08.28-2.2-.35-3.16m-3.3 8.37c-.45-1.82-6.7-3.42-7.37.31c-.55 3.04 3.23 2.63 5.48 2.2c1.47-.28 2.24-1.28 1.89-2.51"/><path fill="#fff" d="M73.82 69.81c-1.3-2.73 10.58 3.96 14.2 7.48c2.66 2.59 5.26 5.5 4.35 9.28c-.27 1.13-.89 2.37-2.09 2.68c-1.28.33-2.57-.51-3.51-1.3c-3.16-2.64-5.23-6.63-7.31-10.13c-1.69-2.84-3.42-5.56-5.64-8.01m6.54-.94c-2.83-1.52 13.74.87 15.51 6.75c.33 1.08.19 2.46-1.26 1.95c-1.96-.68-3.69-2.55-5.34-3.74c-2.78-2-5.8-3.53-8.91-4.96m-7 7c1.89 3.38 3 4.9 5.41 8.26c1.78 2.47 3.37 5.44 3.73 8.51c.29 2.44-2.06 1.9-3.11.42c-1.9-2.67-3.38-5.73-4.47-8.8c-.96-2.75-3.25-10.76-1.56-8.39m30.44 4.5c-1.2-2.08-6.46-3.24-6.78.66c-.23 2.85 1.48 4.71 4.07 4.52c.97-.13 4.13-2.8 2.71-5.18m-2.9 8.8c-.14-1.32-2.2-1.52-3.59-1.29c-1.24.21-1.8 1.28-1.44 2.45c.32 1.06.99 2.4 2.14 2.42c1.34.03 2.89-2.07 2.89-3.58m-7.19 4.86c-1.04-1.22-4.92-2.73-6.09-.52c-.87 1.65.9 4.5 1.37 6.2c.44 1.57 1.28 2.11 2.9 1.79c1.58-.32 2.56-1.15 3.35-2.65c.99-1.87-.43-3.45-1.53-4.82m-8.28 4.17c.85.47.99 2.06.44 3.12c-.51.99-1.8.75-2.55.21c-.79-.57-1.54-1.82-1.02-2.8s2.15-.91 3.13-.53"/><g fill="#fff"><ellipse cx="64" cy="52.36" rx="2.93" ry="2.98"/><path d="M66.93 62.74c0 10.55 0 29.63-2.93 29.63s-2.93-19.08-2.93-29.63s1.31-8.59 2.93-8.59s2.93-1.96 2.93 8.59"/></g><path fill="#fff" d="M63.26 50.56c-.17-.65-2.91-15.84-13.68-22.8c-.04-.03-1.05-.72-2.23-.72c-1.16 0-2.39 1.16-2.39 2.32s.94 2.11 2.11 2.11c.75 0 1.81-1 2.49-.4c9.29 5.99 12.28 19.41 12.32 19.56c.11.45 1.52.47 1.38-.07m1.48 0c.17-.65 2.91-15.84 13.68-22.8c.04-.03 1.05-.72 2.23-.72c1.16 0 2.39 1.16 2.39 2.32s-.94 2.11-2.11 2.11c-.75 0-1.81-1-2.49-.4c-9.29 5.99-12.28 19.41-12.32 19.56c-.11.45-1.52.47-1.38-.07"/></svg></div>
    <div class="shape" data-shape="strawberry"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#fff" d="M51.348 15.912c-3.332-3.347-7.33-4.796-11.498-4.796c-.359 0-.721.016-1.08.038C37.734 6.492 36.295 2 36.295 2s-6.291 3.991-9.97 7.716c-4.255-3.327-9.149-6.391-9.149-6.391s-1.044 7.646-.678 13.247c-5.577-.361-13.188.692-13.188.692s3.051 4.912 6.368 9.185C5.97 30.146 2 36.47 2 36.47s4.646 1.497 9.382 2.538c-.159 4.421 1.261 8.681 4.776 12.213C23.599 58.692 36.494 62 46.373 62c5.729-.001 10.445-1.113 12.492-3.17c5.522-5.549 4.184-31.161-7.517-42.918m6.074 41.482c-1.236 1.242-4.789 2.57-11.049 2.571c-9.275 0-21.77-3.147-28.771-10.18c-8.058-8.096-3.363-20.183 4.41-27.987c5.389-5.413 12.057-8.646 17.838-8.646c3.9.001 7.283 1.411 10.055 4.198c4.908 4.93 8.424 13.172 9.643 22.61c1.147 8.891-.2 15.499-2.126 17.434" stroke-width="1.5" stroke="#fff"/><path fill="#fff" d="M40.172 18.321c.578.403 1.215.606 1.771.607c.541 0 1.006-.19 1.271-.573c.545-.775.063-2.052-1.072-2.848c-.58-.405-1.215-.607-1.773-.607c-.539 0-1.006.19-1.273.572c-.543.776-.063 2.054 1.076 2.849m3.902 14.408a1.34 1.34 0 0 0-.891.31c-.715.621-.557 1.976.352 3.025c.604.695 1.389 1.081 2.057 1.08c.34.001.65-.099.891-.309c.717-.621.557-1.975-.352-3.024c-.604-.696-1.387-1.081-2.057-1.082m-8.781-8.797a1.3 1.3 0 0 0-.865.294c-.727.609-.592 1.968.303 3.031c.602.715 1.391 1.114 2.064 1.115c.33 0 .629-.097.867-.295c.727-.61.59-1.966-.303-3.033c-.601-.714-1.392-1.113-2.066-1.112m17.111 2.537c-.518-.945-1.369-1.53-2.111-1.53a1.26 1.26 0 0 0-.604.148c-.832.456-.967 1.813-.301 3.032c.52.945 1.367 1.529 2.111 1.529c.213 0 .418-.047.604-.148c.833-.455.967-1.812.301-3.031m2.551 11.924q-.153 0-.303.039c-.918.24-1.379 1.521-1.027 2.866c.313 1.198 1.162 2.037 1.994 2.038q.153 0 .303-.038c.918-.239 1.379-1.523 1.027-2.868c-.312-1.196-1.164-2.037-1.994-2.037M53.76 51.021c-.354.001-.674.105-.918.327c-.703.636-.518 1.987.414 3.019c.607.671 1.381 1.038 2.041 1.039c.354-.001.676-.106.922-.329c.701-.636.516-1.987-.418-3.017c-.606-.669-1.379-1.039-2.041-1.039m-20.837-.979c-.569-.384-1.189-.573-1.736-.572c-.559 0-1.041.198-1.309.598c-.527.788-.02 2.054 1.135 2.825c.57.383 1.191.573 1.736.573c.561 0 1.042-.2 1.309-.6c.528-.786.02-2.053-1.135-2.824m-11.758-3.359c-.569-.382-1.189-.571-1.735-.571c-.561 0-1.042.199-1.309.597c-.527.787-.02 2.055 1.134 2.825c.57.382 1.191.574 1.738.573c.559 0 1.041-.199 1.307-.6c.526-.786.02-2.052-1.135-2.824m21.382 7.939a3.4 3.4 0 0 0-1.275-.259c-.797-.001-1.463.326-1.701.91c-.354.877.404 2.013 1.691 2.531c.434.175.871.258 1.275.257c.797 0 1.465-.324 1.699-.908c.356-.878-.4-2.012-1.689-2.531m2.617-9.926c-.543-.323-1.119-.481-1.633-.481c-.617-.001-1.143.229-1.406.672c-.486.814.09 2.053 1.283 2.763c.543.322 1.119.48 1.635.48c.615 0 1.141-.229 1.404-.672c.485-.816-.09-2.054-1.283-2.762m-10.596-6.943c-.602-.5-1.295-.758-1.895-.757c-.465-.001-.873.155-1.138.474c-.604.729-.229 2.042.839 2.928c.603.498 1.297.758 1.897.758c.465 0 .871-.156 1.137-.475c.604-.73.231-2.043-.84-2.928m-10.701-14.53c-.385.001-.73.119-.982.368c-.676.665-.434 2.008.539 2.997c.611.618 1.364.953 2.009.954c.384-.001.729-.119.981-.368c.676-.666.435-2.008-.539-2.996c-.612-.621-1.364-.954-2.008-.955m-1.055 11.751c-.598-.473-1.275-.716-1.863-.715c-.484 0-.909.163-1.175.5c-.589.741-.184 2.046.904 2.906c.598.474 1.276.715 1.864.715c.484 0 .908-.161 1.174-.499c.587-.742.184-2.045-.904-2.907" stroke-width="1.5" stroke="#fff"/></svg></div>
    <div class="shape" data-shape="bear"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#fff" d="M113.95 98.69c-2.66-4.98-7.67-6.19-13.15-5.06c-.1.02-.22.05-.34.09c1.57-2.83 2.78-5.6 2.97-10.71c.45-12.58-4.74-18.76-10.12-23.33c-11.15-9.47-43.38-6.35-43.88-6.33c-4.14.17-9.91 2.7-13.04 5.46c-6.9 6.01-12.22 14.48-12.61 23.82c-.21 3.38.38 7.39 1.99 10.63c-4.33-.54-8.91.95-11.77 6.05c-2.32 4.13-1.66 9.19.86 13.85c3.41 6.32 11.16 12.29 18.83 10.52c7.78-1.79 14.53-9.5 21.4-13.57c.49-.29 1.07-.39 1.64-.33c4.28.49 10.3.49 14.08.08c.79-.08 1.57.18 2.13.73c.71.7 1.42 1.36 1.68 1.6c4.31 3.97 9.24 8.26 14.72 10.45c9.28 3.7 18.49-.44 23.48-9.3c2.62-4.66 3.77-9.72 1.13-14.65"/><path fill="#fff" d="M84.86 105.17c-.44 0-.89-.04-1.34-.12c-4.05-.75-6.46-4.78-6.75-8.38c-.29-3.64 1.11-7.09 2.51-9.98c.25-.52 2.85-5.29 3.55-8.53c1.05-4.89.17-9.35-.14-11.34c-.31-2 1.21-1.66 1.87-.23c1.62 3.51 1.91 8.42 1.18 12.17c-.67 3.43-3.54 8.71-3.79 9.23c-1.23 2.54-2.46 5.52-2.23 8.45c.19 2.41 1.77 5.22 4.33 5.69c2.77.51 4.99-.49 7.33-2.63l2.52.96c-1.85 1.7-5.16 4.71-9.04 4.71M45.95 81.45c-.6-3.25-1.02-7.36 1.02-10.27l-1.49-2.87c-3.78 3.83-3.16 9.85-2.45 13.67c.09.51 1.56 8.03.75 10.99c-.93 3.4-3.95 6.13-7.39 6.83c-1.86-2.97-4.65-5.1-7.73-6.34c-3-1.21-7.31-.88-9.76.91c2.64-.73 5.72-.56 8.3.67c3.59 1.7 5.81 4.03 7.84 8.98c.67 1.63 1.2 4.23 2.75 3.78c.89-.25 1.59-1.15 1.25-2.58c-.36-1.51-.9-2.54-.9-2.54s5.48-.94 8.51-8.93c1.55-4.1-.6-11.8-.7-12.3"/><path fill="#fff" d="M91.44 107.55c-.29.54-.7.96-1.29.95c-.91-.01-1.49-1.08-1.5-2c-.04-7.24 7.89-13.85 15.19-13.26c-5.71 1.22-9.93 5.88-11.97 13.25c-.1.35-.25.72-.43 1.06M54.02 80.33l-2.2-2.39c3.6-3.43 8.51-8.15 9.36-12.41l2.91.58c-.95 4.78-5.02 10.55-8.67 14.25c-.39.4-1.03.38-1.4-.03"/><path fill="#fff" d="M71.39 65.14c6.05-1.32 10.47-5.03 10.75-9.66l-32.92-1.99c-.21 3.53 2.03 6.82 5.7 9.08c-4.57.78-7.69 1.95-9.02 2.51c-.73.31-1.21 1.02-1.21 1.82c.01 3.79 4.06 11.53 6.97 12c2.88.47 9.37-7.89 11.76-11.49c0 5.6.84 15.5 2.52 16.28c3.41 1.57 14.21-4.27 14.53-7.32c.25-2.39-4.54-7.07-9.08-11.23"/><path fill="#fff" d="M100.19 19.5c-.25-4.28-3.1-8.1-7.13-9.55c-3.27-1.17-6.54-.76-9.17.72c-1.2.67-2.64.78-3.88.16c-1.92-.96-5.25-2.26-9.99-2.86c-4.72-.6-8.37-.08-10.56.44c-1.42.34-2.88-.16-3.91-1.2A11 11 0 0 0 47.73 4c-5.13 0-9.68 3.74-10.7 8.77c-.64 3.13.11 6.17 1.79 8.53c1.46 2.07 1.75 4.78.81 7.14c-.95 2.38-2.76 7.61-2.72 10.51c.15 12.65 11.66 19.21 26.88 21.14s28.83-2.82 31.39-15.91c.58-2.96.42-6.83-.09-9.73c-.42-2.39.37-4.86 2.06-6.61c2.02-2.1 3.24-5.03 3.04-8.34"/><path fill="#fff" d="M41.35 15.68c.41-3.19 3.18-5.46 6.21-5.08c1.15.15 4.6 1.5 3.42 3.3c-.22.33-.55.56-.87.79a26.1 26.1 0 0 0-5.68 5.63c-.29.4-.73.85-1.16.66c-1.52-.65-2.1-3.84-1.92-5.3m53.94 6.85c.41-3.19-1.72-6.09-4.74-6.47c-1.15-.15-4.83.3-4.13 2.34c.13.38.39.68.64.99c1.69 2.04 3.08 4.37 4.09 6.88c.18.46.49 1.01.96.93c1.63-.26 2.99-3.2 3.18-4.67"/><path fill="#fff" d="M61.95 33.17c-2.95 3.39-5.17 5.31-7.26 8.3c-3.55 5.08-1.08 13.91 8.98 15.22c7.01.91 13.05-2.41 13.17-9.12c.08-4.25-3.67-9.92-5.61-13.58c-2.42-4.54-6.21-4.35-9.28-.82" opacity="1"/><ellipse cx="53" cy="31.49" opacity="1" rx="4.78" ry="4.06" transform="rotate(-81.9 52.996 31.493)"/><ellipse cx="80.58" cy="35" opacity="1" rx="4.78" ry="4.06" transform="rotate(-81.9 80.576 34.999)"/><path fill="none" stroke="#fff" stroke-linecap="round" stroke-miterlimit="10" stroke-width="2.446" d="M57.59 47.22c1.9 5.61 11.26 6.83 14.61 1.87" opacity="1"/><path d="M67.78 47.83c-2.41.53-4.86.11-6.47-1.91c-1.21-1.51-2.46-4.04-.74-5.83c2.44-2.5 8.51-1.75 10.71.73c1.25 2.11-1.22 6.53-3.5 7.01" opacity="1"/><path fill="#fff" d="M16.2 106.55c.03-1.83 1.41-4.49 3.13-5.13c4.1-1.55 8.56.32 11.03 5.93c2.04 4.64 2.24 9.51 1.37 10.82c-1.29 1.93-3.17 1.62-4.47 1.39c-2.37-.42-4.43-1.85-6.29-3.39c-1.89-1.57-4.85-4.75-4.77-9.62m95.56-.08c-.06-1.83-1.48-4.46-3.2-5.09c-4.12-1.49-8.56.44-10.94 6.09c-1.97 4.67-1.75 8.96-1.48 9.87c.84 2.81 3.47 2.54 4.76 2.29c2.36-.46 4.4-1.92 6.24-3.48c1.87-1.58 4.77-4.8 4.62-9.68" opacity="1"/></svg></div>
    <div class="shape" data-shape="egg"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M256 16C166 16 76 196 76 316c0 90 60 180 180 180s180-90 180-180c0-120-90-300-180-300"/></svg></div>
    <div class="shape" data-shape="crown"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#fff" d="M94.52 21.81c2.44-1.18 4.13-3.67 4.13-6.56a7.28 7.28 0 0 0-14.56 0c0 2.93 1.73 5.44 4.22 6.6c-2.88 15.6-7.3 27.21-23.75 29.69c0 0 4.43 22.15 25.15 22.15s22.82-21.93 22.82-21.93c-16.81.86-18.23-20.27-18.01-29.95"/><path fill="#fff" d="M34.74 21.81c-2.44-1.18-4.13-3.67-4.13-6.56a7.28 7.28 0 0 1 14.56 0c0 2.93-1.73 5.44-4.22 6.6c2.88 15.6 7.3 27.21 23.75 29.69c0 0-4.43 22.15-25.15 22.15S16.74 51.77 16.74 51.77c16.8.85 18.22-20.28 18-29.96"/><path fill="#fff" d="M89.43 73.69c.09 0 .18.01.27.01c5.71 0 10-1.67 13.22-4.08z"/><path fill="#fff" d="M119.24 16.86c-3.33-.45-6.51 2.72-7.09 7.06c-.36 2.71.37 5.24 1.78 6.87l-2.4 9.95s-3.67 23.51-22.21 28.15C74.5 72.6 69.13 45.47 67.83 37.09c2.82-1.4 4.77-4.3 4.77-7.67c0-4.73-3.83-8.56-8.56-8.56s-8.56 3.83-8.56 8.56c0 3.39 1.98 6.32 4.85 7.7c-1.03 8.27-5.57 34.5-21.57 31.76c-16.24-2.79-23.33-30.14-24.97-37.58c1.95-1.6 3.04-4.42 2.64-7.45c-.58-4.35-4.02-7.47-7.68-6.98s-6.15 4.41-5.57 8.75c.42 3.16 2.36 5.67 4.79 6.62l12.72 79.03s11.1 8.77 43.35 8.77s43.35-8.77 43.35-8.77l12.75-79.24c2.06-1.08 3.68-3.51 4.08-6.49c.59-4.35-1.64-8.23-4.98-8.68"/><ellipse cx="64.44" cy="88.3" fill="#fff" rx="9.74" ry="11.61"/><path fill="#fff" d="M64.44 79.56c.38.42.72 1.19 0 2.69s-4.6 3.53-5.31 3.94c-.71.42-1.18.23-1.4.06c-1.05-.84-.65-2.74.03-3.9c1.46-2.51 4.55-5.1 6.68-2.79"/><path fill="#fff" d="M63.72 92.63c-1.1.53-4.71 2.14-3.52 4.05c.7 1.13 2.15 1.61 3.48 1.67s2.64-.36 3.82-.97c5.6-2.9 6.05-10.52 4.96-11.1c-1.12-.6-1.88.95-2.46 1.61a20.3 20.3 0 0 1-6.28 4.74"/><path fill="#fff" d="M118.09 78.8c1.56-8.63-4.24-10.79-4.24-10.79s-3.74-.68-5.5 9.03c-1.76 9.7 1.98 10.38 1.98 10.38s6.19.01 7.76-8.62"/><path fill="#fff" d="M115.51 70.96c1.36 1.82-.25 4.51-2.86 6.3c-.77.53-1.79.33-1.94-.11c-.42-1.26-.24-2.69.32-3.9c1.66-3.63 3.79-3.21 4.48-2.29"/><path fill="#fff" d="M9.76 79.06C8.19 70.44 14 68.27 14 68.27s3.74-.68 5.5 9.03c1.76 9.7-1.98 10.38-1.98 10.38s-6.2.01-7.76-8.62"/><path fill="#fff" d="M15.78 71.2c1.34 1 .79 2.31-.22 3.22c-1.15 1.05-2.03 2.2-3.01 3.39c-.15.18-.32.38-.56.43c-.46.1-.83-.37-.98-.82c-.43-1.26-.35-2.74.29-3.9c1.82-3.31 3.96-2.71 4.48-2.32"/><path fill="#fff" d="M99.99 87.16c-.69 3.93-3.84 6.66-7.05 6.1s-3.65-3.91-2.96-7.84s2.24-6.94 5.44-6.38c3.21.56 5.26 4.2 4.57 8.12m-69.56 0c.69 3.93 3.84 6.66 7.05 6.1s3.65-3.91 2.96-7.84s-2.24-6.94-5.44-6.38s-5.25 4.2-4.57 8.12"/><path fill="#fff" d="M35.08 84.54c-.73.82-2.51 2.47-3.14 1.21c-.86-1.72.33-4.32 1.69-5.18s2.47-.18 2.66.59c.23.98-.56 2.64-1.21 3.38m56.9 2.51c-.99-.15-1.1-3.56 1.56-6.24c1.27-1.28 3.09.24 2.63 2.29c-.44 1.95-2.38 4.23-4.19 3.95"/><path fill="#fff" d="M109.15 98.21c-5.99 3-19.73 10.99-45.1 10.99s-39.11-7.99-45.1-10.99c0 0-2.15 1.15-2.15 2.35v9.21c0 1.23.65 2.36 1.71 2.99c4.68 2.76 18.94 9.28 45.55 9.28s40.87-6.52 45.55-9.28a3.48 3.48 0 0 0 1.71-2.99v-9.21c-.02-1.2-2.17-2.35-2.17-2.35"/><path fill="#fff" d="M39.6 110.84c2.8.55 3.65.79 3.46 2.35c-.39 3.07-6.76 2.34-10.53 1.35c-7.79-2.05-9.37-4.21-9.37-6.14c0-1.77 1.36-1.98 3.46-1.24c2.51.89 6.39 2.39 12.98 3.68"/><path fill="none" stroke="#fff" stroke-linecap="round" stroke-miterlimit="10" stroke-width="4" d="M109.15 100.23s-16.57 9.38-45.1 9.38s-45.1-9.38-45.1-9.38"/><path fill="#fff" d="M26.97 49.57c5.32-3.8 8.18-10.61 8.43-21.45c.02-.98.3-1.27.83-1.33c.85-.09.99.68.98 1.23c-.24 11.7-1.73 19.01-7.63 23.13c-.29.2-2.36 1.46-3.24.59c-1.05-1.02.29-1.93.63-2.17m4.87-34.03c-.17-1.81.25-5.07 5-6.55c1.39-.43 2.25.25 2.41.78c.4 1.32-.76 1.84-1.29 2.01c-3.65 1.18-3.83 3-4.58 4.16s-1.48.15-1.54-.4m46.38 31.63c4.81-4.27 8-9.04 10.1-19.9c.19-.96.47-1.22.99-1.2c.85.02.89.81.8 1.35c-1.78 11.58-3.47 14.88-9.4 21.45c-.67.74-2.3 1.41-3.22.64c-.83-.69.13-1.8.73-2.34m7.08-31.54c-.17-1.81.25-5.07 5-6.55c1.39-.43 2.25.25 2.41.78c.4 1.32-.76 1.84-1.29 2.01c-3.65 1.18-3.83 3-4.58 4.16c-.74 1.16-1.48.15-1.54-.4"/><path fill="#fff" d="M31.59 71.62C19.97 66.35 16.55 52.6 14.73 46.63c-.24-.79-.12-1.54.67-1.78s1.26.27 1.51 1.06c1.32 4.33 6.45 18.79 17.04 22.9c.77.3 1.97 1.03 1.32 2.28c-.43.81-1.81 1.38-3.68.53M12.68 24.63c-.56-1.16-.79-2.26-3.84-3.53c-.77-.32-1.28-1.03-1.07-1.83s1.01-1.4 2.17-1.2c3.77.65 4.59 4.48 4.75 5.81c.15 1.28-1.44 1.91-2.01.75m84.19 46.99c11.62-5.27 15.04-19.02 16.86-24.99c.24-.79.12-1.54-.67-1.78s-1.26.27-1.51 1.06c-1.32 4.33-6.45 18.79-17.04 22.9c-.77.3-1.97 1.03-1.32 2.28c.43.81 1.81 1.38 3.68.53m18.91-46.99c.56-1.16.79-2.26 3.84-3.53c.77-.32 1.28-1.03 1.07-1.83s-1.01-1.4-2.17-1.2c-3.77.65-4.59 4.48-4.75 5.81c-.15 1.28 1.45 1.91 2.01.75m-56.4 4.92c.61-1.25 1.68-2.96 5.17-3.68c1.34-.28 1.73-.86 1.61-1.74c-.24-1.83-2.52-1.7-3.75-1.41c-4.1.96-5.01 4.6-5.18 6.04c-.17 1.37 1.55 2.04 2.15.79"/></svg></div>
    <div class="shape" data-shape="fish"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#fff" d="m96.89 56.06l1.31-12.67l-3.85-17.46s2.82-3.1 4.41-3.85s3.38-1.17 3.38-1.17s4.13-.7 6.85-.8c2.72-.09 5.82.38 5.73-.94c-.09-1.31-12.29-3.38-18.96-3.57c-6.66-.19-28.91.84-44.96 8.63S30.53 38.98 30.53 38.98l-5.35 10.61l-5.35 2.16s-4.88 8.17-6.48 12.86s-3.28 8.35-4.13 9.29c-.84.94-5.07 4.22-5.07 4.88s4.32 3.1 4.32 3.75c0 .66-3.47 1.5-3.47 2.25s6.1 7.6 15.3 14.55s20.55 12.01 28.91 14.08c8.35 2.06 19.52 3 19.99 2.63c.47-.38-8.73-7.6-8.73-7.6s8.82 3.75 14.36 4.41s6.41.7 11.83.49s14.17-7.91 14.17-7.91l4.69-15.49l-2.11-10.11s-2.84-4.55-2.96-5.49s1.17-.22 2.32.07c1.41.35 4.69 2.63 6.76 4.79c1.27 1.33 5.18 5.5 6.8 7.25c.77.84 2.15.52 2.49-.56l1.53-8.8l-.84-27.78l-3.18-10.93c-.36-.94-1.63-1.11-2.22-.28c-2.25 3.17-7.15 10.68-8.59 12.53c-1.97 2.53-5.34 6.36-7.25 7.04c-1.13.4-1.55.21-1.55.21z"/><path fill="#fff" d="M85.25 113.13s14.44-2.85 16.96-16.75c1.97-10.84-2.11-22.1-2.11-22.1s.15-1.54 1.83.56c3.1 3.87 8.87 16.68 1.48 29.7c-6.25 11.01-17.74 9.01-18.44 9.01s.28-.42.28-.42m16.89-92.22s-8.8-.63-9.15 7.46c-.28 6.41 3.24 10.91 3.1 17.81s-.9 11.89.63 11.68c1.06-.14 3.38-3.45 3.45-10.56s-4.71-14.46-4.58-19.01c.15-4.7 6.55-7.38 6.55-7.38"/><path fill="#000" d="M114.96 37.53c-1.47.58.07 5.07.56 6.48s1.94 9.08 2.04 20.34c.07 8.09-.7 15.98-1.06 17.74s-1.13 4.43.77 4.86s3.79-3.52 4.86-10.21c.84-5.28.77-10.07.84-15.06c.15-10.5-2.39-17.25-3.31-19.5c-.9-2.26-2.73-5.43-4.7-4.65m-37.22 1.73c-1.69.19 1.12 6.42 1.88 10.98c1.22 7.32 1.22 12.01 1.06 18.04c-.15 5.59-1.53 15.27-5.91 23.51c-.96 1.81-1.55 3.38-.21 3.52c2.67.28 7.7-6.22 10.28-13.23c2.9-7.89 3.45-14.92 2.39-23.3c-.85-6.74-2.42-11.19-3.47-13.51c-.96-2.1-3.11-6.33-6.02-6.01M54.35 26.48c-2.6.73 1.06 6.12 2.65 10.25c2.49 6.45 7.65 18.11 7.79 30.43S61.13 88.54 60 91.35c-1.17 2.93-2.98 7.13-3.54 8.33s-.54 2.58.07 2.75c1.41.38 3.78-1.24 6.19-3.66c1.6-1.6 4.6-4.79 8.05-14.71c1.89-5.44 3.68-14.95 2.37-25.46c-1.56-12.48-7.1-20.88-9.08-23.89c-2.93-4.46-6.68-9.08-9.71-8.23"/><path fill="#000" d="M38.02 38.44c-2.11.58 3.87 6.78 6.69 13.96s3.68 13.16 4.04 19.43c.35 6.26-.52 12.95-1.13 17.08c-.49 3.35-2.28 9.43-1.92 10.56c.35 1.13 2.44 1.17 3.99-1.36s4.88-8.07 6.92-20.04c.95-5.56.49-18.6-5.56-27.94c-5.22-8.05-10.57-12.37-13.03-11.69M19.84 51.75s3.94-5.63 5.63-7.7c1.69-2.06 6.29-6.76 6.29-6.76s.19 13.42.66 16.99s2.06 11.45 3.85 15.58c.93 2.15 2.71 7.4 2.44 9.57c-.47 3.85-4.8 9.63-6.66 9.85c-3.94.47-7.79-7.02-9.57-11.92c-2.55-6.94-4.52-19.61-2.64-25.61"/><path fill="#000" d="M34.15 75.54c.1 2.69-2.09 4.41-4.41 4.41s-4.08-2.22-4.08-4.55s1.97-4.08 4.29-4.08s4.1 1.68 4.2 4.22"/><path fill="#fff" d="M30.07 75.44c-.61.7-2.32.69-2.93-.03s-.53-2.18.35-2.92c.88-.75 2.11-.89 2.84.22c.51.79.49 1.86-.26 2.73"/></svg></div>
    <div class="shape" data-shape="flower"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#000" d="m46.5 31.2l-2.8-8.3S52.2 10.6 49 8.3s-12.6 9.5-12.6 9.5h-9S18 6.1 14.8 8.3s5.3 14.6 5.3 14.6l-2.8 8.3S3 36.3 4.2 40s15.9-.4 15.9-.4l7.3 5.2s.5 14.9 4.5 14.9s4.5-14.9 4.5-14.9l7.3-5.2s14.7 4.1 15.9.4c1.3-3.7-13.1-8.8-13.1-8.8"/><g fill="#fff"><path d="M41.8 9.9c0 10-4.4 18.2-9.9 18.2S22 20 22 9.9s7.2-4.2 9.9-4.2s9.9-5.8 9.9 4.2"/><path d="M13 16.5c9.8 3.1 16.4 9.7 14.7 14.8s-11 6.6-20.8 3.5s-1.9-8-1.1-10.5c.8-2.4-2.6-10.9 7.2-7.8"/><path d="M10.5 45.3c6-8.1 14.5-12.2 18.9-9c4.4 3.1 3.1 12.2-3 20.4c-6 8.1-8.4-.7-10.5-2.2c-2.1-1.6-11.5-1.1-5.4-9.2"/><path d="M37.8 56.5c-6-8.1-7.4-17.2-3-20.4c4.4-3.1 12.9.9 18.9 9s-3.3 7.6-5.4 9.1c-2.1 1.6-4.5 10.4-10.5 2.3"/><path d="M57.1 34.6c-9.8 3.1-19.1 1.5-20.8-3.5c-1.6-5.1 5-11.7 14.7-14.8c9.8-3.1 6.4 5.4 7.2 7.9c.8 2.4 8.7 7.3-1.1 10.4"/></g><ellipse cx="32" cy="32.4" fill="#fff" rx="3.8" ry="3.7"/></svg></div>
    <div class="shape" data-shape="leaf"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#fff" d="M123.69 58.49c.77-1.44 7.24-12.78 2.45-13.48c-9.11-1.34-18.98-.12-27.47 3.75c-.32-6.09-1.4-12.14-2.88-18.04c-1.64-6.57-3.5-13.17-6.87-19.09c-1.1-1.93-2.66-4.8-4.97-5.49c-1.64-.48-3.65 1.45-4.7 2.58c-1.59 1.69-3.05 3.56-4.37 5.52c-2.73 4.06-4.97 8.75-6.56 13.54c-.75 2.25-1.26 4.55-1.67 6.88a65.2 65.2 0 0 0-13.58-12.77C45.33 16.48 36.3 11.04 27.15 8.45c-1.58-.45-2.8-.53-3.75-.33c-2.79.62-3.15 3.87-3.14 8.06c.06 15.98 4.31 33.09 14.4 45.75c-1.69-.07-3.36-.11-5-.11c-5.62.01-11.29.04-16.84 1.07C9.71 63.47.15 65.25.1 69.71c-.03 2.41 2.25 4.75 3.77 6.37c4.67 4.96 10.42 8.68 16.21 12.19c4.84 2.93 9.88 5.58 15.15 7.63c-5.77 6.46-9.77 14.67-11.49 23.02c-.97 4.74 11.89 2.54 13.51 2.31c7.25-1.01 14.62-2.26 21.19-5.66c2.38-1.23 4.88-2.83 7.28-4.73c.38 3 1.03 5.85 1.98 8.26c.78 2 5.03-1.92 5.58-2.4c5.96-5.17 10.13-12.53 11-20.38c.01-.07.01-.13.01-.2c1.15.41 2.33.7 3.48.81c7.87.75 15.92-1.82 22.2-6.59c.58-.44 5.28-3.79 3.49-4.97c-2.45-1.61-5.51-2.94-8.81-3.99c2.4-1.53 4.6-3.23 6.44-4.93c5.46-4.99 9.17-11.49 12.6-17.96"/><g fill="#fff"><path d="M70.8 112.16s3.89-9.57 11.77-15.89c7.01-5.64 17.86-8.08 21.52-8.52c0 0-8.83.32-18.96 4.35c0 0 10.09-29 35.72-40.69c0 0-21.78 4.57-37.48 38.53c0 0-7.86-21.23 0-69.13c0 0-9.14 41.81-2.16 69.46c0 0-18.98-11.47-53.21-74c0 0 23.61 52.16 50.2 75.39c0 0-25.28-12.05-64.84-18.79c43.75 12.33 48.5 15.49 63.92 20.99c0 0-28.68 4.81-45.34 21.79c0 0 25.51-17.2 46.33-19.12c.01 0-5.79 6.63-7.47 15.63"/><path d="M31.94 116.29c-.19 0-.37-.08-.5-.23a.644.644 0 0 1 .04-.86c13.88-14.15 36.27-19.96 43.41-21.52c-2.66-.97-5.02-1.87-7.49-2.82c-10.16-3.89-20.67-7.91-54.22-17.37a.64.64 0 0 1-.46-.75c.08-.33.39-.55.74-.49c30.76 5.24 53.12 13.79 61.44 17.28c-25.22-24.15-47.27-72.49-47.5-72.99a.65.65 0 0 1 .3-.84c.3-.15.68-.04.85.27c28.61 52.27 46.7 68.88 51.62 72.76c-6.16-27.47 2.47-67.65 2.56-68.06c.08-.34.41-.58.75-.49c.34.07.57.39.51.73c-6.56 40.03-2.05 61.55-.5 67.26c15.61-32.5 37-37.34 37.22-37.39c.35-.05.64.12.74.43c.11.31-.04.65-.34.78c-21.97 10.02-32.53 33.21-34.88 39c9.56-3.53 17.74-3.87 17.82-3.88h.03c.33 0 .62.25.64.59c.03.35-.22.65-.56.69c-3.28.39-14.23 2.77-21.2 8.38c-7.65 6.14-11.54 15.54-11.58 15.64c-.12.3-.46.46-.78.38a.656.656 0 0 1-.45-.74c1.29-6.9 4.9-12.37 6.65-14.71c-20.13 2.54-44.27 18.68-44.52 18.85a.6.6 0 0 1-.34.1M27.62 76.3c22.79 6.68 31.64 10.07 40.24 13.36c3.11 1.2 6.06 2.32 9.63 3.59c.27.1.45.37.42.66c-.02.29-.24.53-.53.58c-.25.04-22.95 3.97-39.42 16.69c8.96-5.23 25.79-13.96 40.25-15.29c.24-.05.51.11.63.35c.12.23.08.51-.09.71c-.04.05-3.12 3.62-5.39 8.98c1.98-3.17 4.9-7.04 8.8-10.17c2.49-2.01 5.44-3.61 8.38-4.86c-1.66.5-3.41 1.09-5.19 1.79c-.22.1-.49.04-.68-.13a.64.64 0 0 1-.16-.67c.08-.24 6.8-19.08 22.73-32.54c-7.16 5.49-15.93 14.91-23.3 30.85c-.11.24-.34.37-.6.38a.64.64 0 0 1-.58-.42c-.06-.14-3.27-9.16-3.5-28.21c-.2 9.66.4 19.62 2.55 28.16c.07.25-.03.51-.24.68c-.21.15-.49.17-.71.03c-.67-.4-14.67-9.21-40.22-51.26c9.4 16.87 23.28 38.8 37.96 51.63c.24.21.29.57.12.84c-.18.26-.52.36-.81.22c-.2-.11-19.52-9.21-50.29-15.95"/></g><path fill="#fff" d="M112.48 117.96c1.41-2.13 1.86-8.57-.17-7.85c-2.33.83-4.81.11-7.13-.42c-2.55-.58-5.1-1.29-7.47-2.43c-1.53-.74-2.99-1.6-4.33-2.65c-4.24-3.34-7.23-6.78-9.81-13.87l-.3-.81l-4.46 3.33l.16.44c.18.5 3.14 11.4 14.16 17.61c2.3 1.3 4.77 2.29 7.26 3.14c3.32 1.13 7.83 1.46 10.53 3.91c.59.51 1.12.26 1.56-.4"/></svg></div>
    <div class="shape" data-shape="skull"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="#fff" d="M402 76.94C362.61 37.63 310.78 16 256 16h-.37A208 208 0 0 0 48 224v100.67A79.62 79.62 0 0 0 98.29 399l23.71 9.42a15.92 15.92 0 0 1 9.75 11.72l10 50.13A32.09 32.09 0 0 0 173.12 496H184a8 8 0 0 0 8-8v-39.55c0-8.61 6.62-16 15.23-16.43A16 16 0 0 1 224 448v40a8 8 0 0 0 8 8a8 8 0 0 0 8-8v-39.55c0-8.61 6.62-16 15.23-16.43A16 16 0 0 1 272 448v40a8 8 0 0 0 8 8a8 8 0 0 0 8-8v-39.55c0-8.61 6.62-16 15.23-16.43A16 16 0 0 1 320 448v40a8 8 0 0 0 8 8h10.88a32.09 32.09 0 0 0 31.38-25.72l10-50.14a16 16 0 0 1 9.74-11.72l23.71-9.42A79.62 79.62 0 0 0 464 324.67v-99c0-56-22-108.81-62-148.73M171.66 335.88a56 56 0 1 1 52.22-52.22a56 56 0 0 1-52.22 52.22M281 397.25a16.37 16.37 0 0 1-9.3 2.75h-31.4a16.37 16.37 0 0 1-9.28-2.75a16 16 0 0 1-6.6-16.9l15.91-47.6C243 326 247.25 321 254 320.13c8.26-1 14 2.87 17.61 12.22l16 48a16 16 0 0 1-6.61 16.9m66.68-61.37a56 56 0 1 1 52.22-52.22a56 56 0 0 1-52.24 52.22Z"/></svg></div>
    `

    let shapes = Array.from(shapePicker.querySelectorAll('.shape'));

    const shapeClickHandlers = [];
    const shapeMouseenterHandlers = [];
    const shapeMouseleaveHandlers = [];

    shapes.forEach((shape, i) => {

        const handleShapeClick = (e) => {
            clicked = true;

            const selectedShape = e.target.closest('.shape').dataset.shape;
            note.dataset.shape = selectedShape;

            if (note) {
                // Remove any existing shape class
                note.classList.remove('square', 'circle', 'heart', 'star', 'strawberry', 'butterfly', 'bear', 'egg', 'crown', 'fish', 'flower', 'leaf', 'skull');

                // Add the new shape class
                note.classList.add(selectedShape);
            }

            shapePicker.classList.remove('active');
            saveNote(noteWrapper);

            setTimeout(() => clicked = false, 0);
        }

        shapeClickHandlers[i] = handleShapeClick;
        shape.addEventListener('click', handleShapeClick);



        const handleShapeMouseenter = (e) => {
            const selectedShape = e.target.closest('.shape').dataset.shape;
            note.classList.remove('square', 'circle', 'heart', 'star', 'strawberry', 'butterfly', 'bear', 'egg', 'crown', 'fish', 'flower', 'leaf', 'skull');
            note.classList.add(selectedShape);
        }

        shapeMouseenterHandlers[i] = handleShapeMouseenter;
        shape.addEventListener('mouseenter', handleShapeMouseenter);



        const handleShapeMouseleave = (e) => {
            if (clicked) return;
            note.classList.remove('square', 'circle', 'heart', 'star', 'strawberry', 'butterfly', 'bear', 'egg', 'crown', 'fish', 'flower', 'leaf', 'skull');
            note.classList.add(note.dataset.shape);
        }

        shapeMouseleaveHandlers[i] = handleShapeMouseleave;
        shape.addEventListener('mouseleave', handleShapeMouseleave);

    });



    const handleDocumentClick = () => {

        menu.classList.remove('active')
        colorPicker.classList.remove('active');
        shapePicker.classList.remove('active');
        sizePicker.classList.remove('active');
        confirmDel.classList.remove('active')
    }

    document.addEventListener('click', handleDocumentClick);







    let currentAngle = parseFloat(noteWrapper.dataset.angle) || 0;
    let currentX = parseFloat(noteWrapper.dataset.translateX) || 0;
    let currentY = parseFloat(noteWrapper.dataset.translateY) || 0;


    function updateTransform(noteWrapper) {
        noteWrapper.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${currentAngle}deg)`;
        noteWrapper.dataset.angle = currentAngle;
        noteWrapper.dataset.translateX = currentX;
        noteWrapper.dataset.translateY = currentY;
    }
    updateTransform(noteWrapper);




    function enableDragOnHandle(note, noteWrapper) {
        let isDragging = false;
        let offsetX, offsetY;


        const handleNoteMouseDown = (e) => {

            const isPinned = noteWrapper.dataset.pinned === "true";
            if (isPinned) return;

            if (e.target.closest('.note') && !e.target.closest('.note-text')) {
                e.preventDefault();

                const rect = noteWrapper.getBoundingClientRect();
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                isDragging = true;
            }
        }

        note.addEventListener("mousedown", handleNoteMouseDown);



        const handleNoteMouseMove = (e) => {
            if (!isDragging) return;


            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const noteWidth = noteWrapper.offsetWidth;
            const noteHeight = noteWrapper.offsetHeight;

            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            newLeft = Math.max(0, Math.min(newLeft, viewportWidth - noteWidth));
            newTop = Math.max(0, Math.min(newTop, viewportHeight - noteHeight));

            noteWrapper.style.left = `${newLeft}px`;
            noteWrapper.style.top = `${newTop}px`;

        }

        document.addEventListener("mousemove", handleNoteMouseMove);




        const handleNoteMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                saveNote(noteWrapper);
            }
        }
        document.addEventListener("mouseup", handleNoteMouseUp);


        return () => {
            note.removeEventListener("mousedown", handleNoteMouseDown);
            document.removeEventListener("mousemove", handleNoteMouseMove);
            document.removeEventListener("mouseup", handleNoteMouseUp);
        };

    }


    const cleanupDrag = enableDragOnHandle(note, noteWrapper);








    function togglePin(noteWrapper, shouldPin, pin) {
        noteWrapper.dataset.pinned = shouldPin;

        if (shouldPin) {
            const anchorEl = findNearbyElement(noteWrapper);
            if (anchorEl) {



                const anchorSelector = getSelector(anchorEl);

                noteWrapper.dataset.anchorEl = anchorEl;
                noteWrapper.dataset.anchorSelector = anchorSelector;
                noteWrapper.dataset.anchorIndex = Array.from(document.querySelectorAll(anchorSelector)).indexOf(anchorEl);
                noteWrapper.dataset.anchorText = anchorEl.textContent.trim() || anchorEl.innerHTML.trim();
                noteWrapper.dataset.anchorMatchMethod = anchorEl.textContent.trim() ? "textContent" : "innerHTML";



                const noteRect = noteWrapper.getBoundingClientRect();
                noteWrapper.dataset.initialNoteLeft = noteRect.left;
                noteWrapper.dataset.initialNoteTop = noteRect.top;


                const anchorRect = anchorEl.getBoundingClientRect();
                noteWrapper.dataset.offsetX = parseFloat(noteWrapper.dataset.initialNoteLeft) - anchorRect.left;
                noteWrapper.dataset.offsetY = parseFloat(noteWrapper.dataset.initialNoteTop) - anchorRect.top;



                startTrackingElement(noteWrapper, anchorEl);
                pin.style.opacity = '1';
            } else {
                // Optionally notify: "No anchor found, can't pin"
                // console.warn("No nearby anchor found for pinning.");
                noteWrapper.dataset.pinned = !shouldPin;
            }
        } else {
            stopTracking(noteWrapper);
            pin.style.opacity = '0.5';
        }

        saveNote(noteWrapper);
    }


    function findNearbyElement(noteWrapper) {
        const rect = noteWrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        noteWrapper.style.pointerEvents = 'none';
        const elements = document.elementsFromPoint(centerX, centerY);
        noteWrapper.style.pointerEvents = '';

        for (const el of elements) {
            if (
                el !== noteWrapper &&
                el !== document.documentElement &&
                !noteWrapper.contains(el) &&
                el instanceof HTMLElement &&
                el.offsetHeight &&
                el.offsetWidth
            ) {
                return el;
            }
        }

        return null;
    }



    function getSelector(el) {
        if (el.id) return `#${CSS.escape(el.id)}`;

        let selector = el.tagName.toLowerCase();

        if (el.className && typeof el.className === 'string') {
            const validClasses = el.className.trim().split(/\s+/).filter(cls =>
                /^[a-zA-Z0-9_-]+$/.test(cls)  // allow only valid CSS class names
            );
            if (validClasses.length) {
                selector += '.' + validClasses.join('.');
            }
        }

        // Add valid data-* attributes
        for (let attr of el.attributes) {
            if (attr.name.startsWith('data-')) {
                selector += `[${CSS.escape(attr.name)}="${CSS.escape(attr.value)}"]`;
            }
        }

        return selector;
    }




    function startTrackingElement(noteWrapper, initialAnchorEl = null) {
        stopTracking(noteWrapper); // Stop previous tracking

        noteWrapper.style.position = 'fixed';
        let anchorEl = initialAnchorEl;
        let wasVisible = true;





        function updatePosition() {
            // Find anchor element again if it’s missing
            if (!anchorEl || !document.body.contains(anchorEl)) {
                anchorEl = findAnchorAgain(noteWrapper);

                if (!anchorEl) {
                    if (wasVisible) {
                        noteWrapper.style.display = 'none';
                        wasVisible = false;
                    }
                    return;
                }
            }




            const anchorRect = anchorEl.getBoundingClientRect();
            const top = anchorRect.top + parseFloat(noteWrapper.dataset.offsetY);
            const left = anchorRect.left + parseFloat(noteWrapper.dataset.offsetX);


            noteWrapper.style.top = `${top}px`;
            noteWrapper.style.left = `${left}px`;
            noteWrapper.style.display = 'flex';
            wasVisible = true;
        }

        updatePosition();

        const intervalId = setInterval(updatePosition, 20);
        trackedNotes.set(noteWrapper, intervalId);
    }




    function findAnchorAgain(noteWrapper) {
        const selector = noteWrapper.dataset.anchorSelector;
        const index = parseInt(noteWrapper.dataset.anchorIndex, 10);
        const anchorText = noteWrapper.dataset.anchorText;
        const matchMethod = noteWrapper.dataset.anchorMatchMethod || "textContent";

        if (!selector || !anchorText || isNaN(index)) return null;

        const candidates = document.querySelectorAll(selector);

        // Helper to normalize text
        function normalize(text) {
            return (text || '').replace(/\s+/g, ' ').trim();
        }

        const normalizedAnchor = normalize(anchorText);

        // Primary method: use index
        if (index >= 0 && index < candidates.length) {
            const candidate = candidates[index];
            const content = matchMethod === "innerHTML"
                ? normalize(candidate.innerHTML)
                : normalize(candidate.textContent);

            if (
                content.includes(normalizedAnchor) ||
                normalizedAnchor.includes(content)
            ) {
                return candidate; // exact match at correct index
            }
        }

        // Fallback method: scan all candidates for text match
        for (const el of candidates) {
            const content = matchMethod === "innerHTML"
                ? normalize(el.innerHTML)
                : normalize(el.textContent);

            if (
                content.includes(normalizedAnchor) ||
                normalizedAnchor.includes(content)
            ) {
                return el; // fallback match
            }
        }

        return null; // no match found
    }



    // stop tracking the anchor element
    function stopTracking(noteWrapper) {
        const id = trackedNotes.get(noteWrapper);
        if (id) {
            clearInterval(id);
            trackedNotes.delete(noteWrapper);
        }

        //ensure it's shown if it was hidden before
        noteWrapper.style.display = 'flex';
    }




    function extractNoteData(noteWrapper) {
        const shadow = noteWrapper.shadowRoot;  // Accessing shadow root

        // Query elements inside shadow DOM
        const note = shadow.querySelector('.note');
        const noteText = shadow.querySelector('.note-text');
        return {
            id: noteWrapper.id,
            content: noteText.value || '',
            color: note.style.backgroundColor,
            position: {
                top: noteWrapper.style.top,
                left: noteWrapper.style.left
            },
            offset: {
                x: parseFloat(noteWrapper.dataset.offsetX),
                y: parseFloat(noteWrapper.dataset.offsetY)
            },
            transform: {
                angle: parseFloat(noteWrapper.dataset.angle),
                x: parseFloat(noteWrapper.dataset.translateX),
                y: parseFloat(noteWrapper.dataset.translateY)
            },
            shape: note.dataset.shape,
            size: note.dataset.size,

            isPinned: noteWrapper.dataset.pinned === "true",
            anchorEl: noteWrapper.dataset.anchorEl || null,
            anchorSelector: noteWrapper.dataset.anchorSelector || null,
            anchorIndex: noteWrapper.dataset.anchorIndex || null,
            anchorText: noteWrapper.dataset.anchorText || null,
            anchorMatchMethod: noteWrapper.dataset.anchorMatchMethod || "textContent",
            visible: noteWrapper.style.display !== "none",
            url: location.href,
        };
    }




    async function saveNote(noteWrapper) {
        const noteData = extractNoteData(noteWrapper);

        const { id } = noteData;
        const existingData = await browser.storage.local.get("notes");
        const notes = existingData.notes || {};

        // Update or add the note
        notes[id] = noteData;

        await browser.storage.local.set({ notes });
    }




    note.appendChild(textArea);
    note.appendChild(removeIcon);
    note.appendChild(pin);
    note.appendChild(menuIcon);

    menu.appendChild(colorIcon);
    menu.appendChild(shapeIcon);
    menu.appendChild(resizeIcon);
    menu.appendChild(dashboardIcon);
    menu.appendChild(deleteIcon);

    noteCon.appendChild(note);
    noteCon.appendChild(menu);
    noteCon.appendChild(colorPicker);
    noteCon.appendChild(shapePicker);
    noteCon.appendChild(sizePicker);
    noteCon.appendChild(confirmDel)

    shadow.appendChild(noteCon)
    document.body.appendChild(noteWrapper);

}


// updating the notes from dashboard
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.notes) {
        const newNotes = changes.notes.newValue;
        const oldNotes = changes.notes.oldValue;

        // Handle deleted notes
        if (oldNotes) {
            const deletedIds = Object.keys(oldNotes).filter(id => !(id in newNotes));

            for (const id of deletedIds) {
                const noteEl = document.getElementById(id);
                if (noteEl) noteEl.remove();
            }
        }



        // Handle updated notes
        for (const noteId in newNotes) {
            const noteEl = document.getElementById(`${noteId}`);
            if (noteEl && noteEl.shadowRoot) {
                const editableEl = noteEl.shadowRoot.querySelector(".note-text");

                if (editableEl && editableEl.value !== newNotes[noteId].content) {
                    editableEl.value = newNotes[noteId].content;
                }
            }
        }
    }



});


// loading all notes from browser.storage.local when the websites is visited
async function loadAllNotes() {
    // console.log("noteKaar is running...")
    const result = await browser.storage.local.get("notes");
    const notes = result.notes || {};

    const currentUrl = location.href;

    Object.values(notes).forEach(noteData => {

        if (noteData.url === currentUrl) {
            setTimeout(() => {
                createStickyNote(noteData);
            }, 1000);
        }
    });
}



loadAllNotes();



