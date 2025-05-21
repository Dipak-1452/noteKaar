chrome.storage.local.get("notes", (result) => {
  const notesObj = result.notes || {};
  const notes = Object.values(notesObj); // Convert object to array
  notes.forEach((note) => {

    addNoteToDashboard(note);

  });
});

function addNoteToDashboard(note) {

  const container = document.getElementById("notes-container");
  
  const noteWrapper = createNoteElement(note);
  container.appendChild(noteWrapper)
  

}

function createNoteElement(note) {

  const noteWrapper = document.createElement("div");
  noteWrapper.className = `noteWrapper ${note.size}`;
  noteWrapper.id = note.id;

  const noteCon = document.createElement("div");
  noteCon.className = `noteCon ${note.size}`;


  const noteDiv = document.createElement("div");
  noteDiv.className = `note ${note.shape} ${note.size}`;
  noteDiv.style.backgroundColor = note.color;


  const textArea = document.createElement("textarea");
  textArea.classList.add("note-text");
  textArea.placeholder = "Take a note..."
  textArea.value = note.content;

  textArea.addEventListener('input', () => {
    saveNote(noteWrapper);
  });

  const menu = document.createElement("div");
  menu.classList.add("menu");
  menu.style.backgroundColor = note.color;

  const menuIcon = document.createElement("span");
  menuIcon.classList.add("menuIcon");
  menuIcon.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10" opacity="0.25" stroke-width="1" stroke="#000"/><path fill="#000" d="M8 13a1 1 0 1 0 0-2a1 1 0 0 0 0 2m4 0a1 1 0 1 0 0-2a1 1 0 0 0 0 2m4 0a1 1 0 1 0 0-2a1 1 0 0 0 0 2" stroke-width="1" stroke="#000"/></svg>
`
  menuIcon.setAttribute("title", "view tools");


  menuIcon.addEventListener("click", (event) => {
    // event.stopPropagation();

    const noteWrapper = event.target.closest('.noteWrapper');
    const menu = noteWrapper.querySelector('.menu');
    menu.classList.toggle('active');
  })

  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  })


  const deleteIcon = document.createElement("span");
  deleteIcon.classList.add("deleteIcon");
  deleteIcon.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#000" fill-rule="evenodd" d="m6.774 6.4l.812 13.648a.8.8 0 0 0 .798.752h7.232a.8.8 0 0 0 .798-.752L17.226 6.4h1.203l-.817 13.719A2 2 0 0 1 15.616 22H8.384a2 2 0 0 1-1.996-1.881L5.571 6.4zM9.5 9h1.2l.5 9H10zm3.8 0h1.2l-.5 9h-1.2zM4.459 2.353l15.757 2.778a.5.5 0 0 1 .406.58L20.5 6.4L3.758 3.448l.122-.69a.5.5 0 0 1 .579-.405m6.29-1.125l3.94.695a.5.5 0 0 1 .406.58l-.122.689l-4.924-.869l.122-.689a.5.5 0 0 1 .579-.406z" stroke-width="0.8" stroke="#000"/></svg>
`
  deleteIcon.setAttribute("title", "delete the note");

  deleteIcon.addEventListener("click", (event) => {
    const noteWrapper = event.target.closest('.noteWrapper');
    const confirmDel = noteWrapper.querySelector('.confirmDel');

    confirmDel.classList.toggle('active');
  });

  const confirmDel = document.createElement("div");
  confirmDel.classList.add("confirmDel");
  confirmDel.innerHTML = `
<p>are you sure?</p>
<div>
<button id='cancelBtn'>Cancel</button>
<button id='deleteBtn'>Delete</button>
</div>
`

  confirmDel.addEventListener("click", (event) => {
    event.stopPropagation();
  })

  const deleteBtn = confirmDel.querySelector('#deleteBtn');
  const cancelBtn = confirmDel.querySelector('#cancelBtn');



  deleteBtn.addEventListener("click", async (event) => {
    const noteWrapper = event.target.closest('.noteWrapper');
    const confirmDel = noteWrapper.querySelector('.confirmDel');
    const noteId = noteWrapper.id;
    noteWrapper.remove(); // Remove from DOM

    // Remove from storage
    const result = await browser.storage.local.get("notes");
    const notes = result.notes || {};
    delete notes[noteId];
    await browser.storage.local.set({ notes });
    // await browser.storage.local.remove(noteId);


    console.log(`Note ${noteId} deleted permanently`);
    confirmDel.classList.remove('active');

  });

  cancelBtn.addEventListener("click", (event) => {
    const noteWrapper = event.target.closest('.noteWrapper');
    const confirmDel = noteWrapper.querySelector('.confirmDel');
    confirmDel.classList.remove('active');
  })


  noteDiv.appendChild(textArea)
  noteDiv.appendChild(menuIcon)

  menu.appendChild(deleteIcon)

  noteCon.appendChild(noteDiv)
  noteCon.appendChild(confirmDel)
  noteCon.appendChild(menu)

  noteWrapper.appendChild(noteCon)




  return noteWrapper;
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.notes) {
    const newNotes = changes.notes.newValue;
    const oldNotes = changes.notes.oldValue;

    // Find deleted note IDs
    const deletedIds = Object.keys(oldNotes).filter(id => !(id in newNotes));

    for (const id of deletedIds) {
      const noteEl = document.getElementById(id);
      if (noteEl) noteEl.remove();
    }


    
    for (const noteId in newNotes) {
      const newNote = newNotes[noteId];
      const oldNote = oldNotes[noteId];

      const noteEl = document.getElementById(noteId);


      const isNew = !oldNote;
      const isContentChanged = newNote.content !== oldNote?.content;
      const isPropertiesChanged = JSON.stringify(newNote) !== JSON.stringify(oldNote);

      if (isNew || isPropertiesChanged) {
        if (noteEl) {
          if (isContentChanged) {
            // Only update content if it has changed
            const editableEl = noteEl.querySelector(".note-text");
            if (editableEl && editableEl.value !== newNote.content) {
                editableEl.value = newNote.content;
                saveNote(noteEl);  // Save updated content
            }
        } else {
            // Replace the whole note if other properties have changed
            const newNoteEl = createNoteElement(newNote);
            noteEl.replaceWith(newNoteEl);
        }
        } else {
          addNoteToDashboard(newNote);
        }
      }
      

    }

  }


});


async function saveNote(noteWrapper) {
  const id = noteWrapper.id;
  const existingData = await browser.storage.local.get("notes");
  const notes = existingData.notes || {};


  notes[id].content = noteWrapper.querySelector('.note-text')?.value || '';

  await browser.storage.local.set({ notes });
}
