let conversationData = null;

function handleConversationSelect() {
    const selectedFilePath = document.getElementById("jsonSelect").value;
    if (selectedFilePath) {
        const endpoint = `/api/load-conversations?path=${encodeURIComponent(selectedFilePath)}`;
        fetch(endpoint)
            .then(response => response.json())
            .then(data => {
                // Lógica para procesar los datos de conversación cargados
                console.log("Conversations loaded:", data);
                console.log("Path:", selectedFilePath);
                
                const mainContent = document.getElementById("main-content");
                // Limpiar el contenido existente
                mainContent.innerHTML = "";

                
                loadConversations();
                scrollToTop();

            })
            .catch(error => console.error('No se pudieron cargar las conversaciones:', error));
    }
}

//Obtener lista de archivos JSON del backend
async function loadJsonFiles() {
    try {
        // Obtener la lista de archivos JSON
        const response = await fetch("/api/json-files");
        const data = await response.json();
        const jsonFiles = data.json_files;
        const selectElement = document.getElementById('jsonSelect');

        // Agregar opciones al select
        jsonFiles.forEach(jsonFile => {
            const option = document.createElement('option');
            option.value = jsonFile;
            option.textContent = jsonFile;
            selectElement.appendChild(option);
        });

        // Verificar el estado de cada archivo
        const statusResponse = await fetch("/api/json-files-status");
        const statusData = await statusResponse.json();
        const statusDict = statusData.status;

        // Aplicar color de fondo si tienen valores guardados
        jsonFiles.forEach(jsonFile => {
            const option = document.querySelector(`option[value="${jsonFile}"]`);
            if (statusDict[jsonFile]) {
                option.classList.add("bg-green-200"); // Aplica un fondo verde si está guardado
            }
        });

        // Preseleccionar la primera opción
        if (jsonFiles.length > 0) {
            selectElement.value = jsonFiles[0];
            handleConversationSelect();
        }
    } catch (error) {
        console.error('Error cargando conversacion:', error);
    }
}

let selectedConvElem = null;  // Global variable to track selected conversation

async function loadConversations() {
    try {
        const response = await fetch("/api/conversations");
        conversationData = await response.json();

        populateGroupDropdown(conversationData);
        populateConversationsList();

        // Mostrar el chat de la primera conversación si está disponible
        if (conversationData && conversationData.length > 0) {
            loadChatMessages(conversationData[0].id);  // Carga el chat del primer elemento
            const conv = document.getElementById(`conv-${conversationData[0].id}`);
            unSelectConversation();
            conv.classList.add("bg-gray-400");
            selectedConvElem = conv;
        }

        const selectElement = document.getElementById('jsonSelect');
        const nombre = selectElement.value;

        // Solicitar valores de relación y conocimiento al servidor
        const valoresResponse = await fetch(`/api/obtener_valor_evaluacion/${nombre}`);
        const valoresData = await valoresResponse.json();

        // Si el servidor devuelve valores guardados, actualizamos las barras de progreso
        if (valoresData.relacion !== null && valoresData.conocimiento !== null) {
            document.getElementById("relationLabel").innerHTML = `% Relación con la asignatura - ${valoresData.relacion}% <span class="material-symbols-outlined icons" style="font-size: 1.15rem;">check_circle</span>`;
            document.getElementById("relationProgress").value = valoresData.relacion;
            document.getElementById("relationValue").textContent = `${valoresData.relacion}%`;

            document.getElementById("knowledgeLabel").innerHTML = `% Conocimiento sobre la asignatura - ${valoresData.conocimiento}% <span class="material-symbols-outlined icons" style="font-size: 1.15rem;">check_circle</span>`;
            document.getElementById("knowledgeProgress").value = valoresData.conocimiento;
            document.getElementById("knowledgeValue").textContent = `${valoresData.conocimiento}%`;

            // Actualizar icono de estado y texto a "Guardado"
            document.getElementById("statusIcon").textContent = "check_circle";
            document.getElementById("statusIcon").classList.remove("text-gray-500");
            document.getElementById("statusIcon").classList.remove("text-red-500");
            document.getElementById("statusIcon").classList.add("text-green-500");
            document.getElementById("statusText").textContent = "Guardado";

            document.getElementById("jsonSelect").classList.add("border-green-200");

            document.getElementById("boton_elim").classList.remove("disabled");
        } else {
            // Si no hay valores guardados, establecemos el estado en "No guardado"
            document.getElementById("relationLabel").textContent = '% Relación con la asignatura';
            document.getElementById("relationProgress").value = 0;
            document.getElementById("relationValue").textContent = '0%';

            document.getElementById("knowledgeLabel").textContent = '% Conocimiento sobre la asignatura';
            document.getElementById("knowledgeProgress").value = 0;
            document.getElementById("knowledgeValue").textContent = '0%';

            document.getElementById("statusIcon").textContent = "hourglass_empty";
            document.getElementById("statusIcon").classList.remove("text-green-500");
            document.getElementById("statusIcon").classList.remove("text-red-500");
            document.getElementById("statusIcon").classList.add("text-gray-500");
            document.getElementById("statusText").textContent = "No guardado";

            document.getElementById("jsonSelect").classList.remove("border-green-200");

            document.getElementById("boton_elim").classList.add("disabled");
        }

    } catch (error) {
        console.error("No se pudieron cargar las conversaciones:", error);
    }
}

function populateGroupDropdown(conversations) {
    const groupSet = new Set();
    conversations.forEach(conv => {
        if (conv.group) {
            groupSet.add(conv.group);
        }
    });

    const groupFilterElem = document.getElementById("groupFilter");
    Array.from(groupSet).forEach(group => {
        const optionElem = document.createElement("option");
        optionElem.value = group;
        optionElem.textContent = group;
        groupFilterElem.appendChild(optionElem);
    });
}

function populateConversationsList() {
    const sidebar = document.getElementById("sidebar-conversations");
    sidebar.innerHTML = ""; // Clear previous conversations

    const selectedGroup = document.getElementById("groupFilter").value;
    const searchText = document.getElementById("textFilter").value.toLowerCase();
    
    // Apply filters
    const filteredData = conversationData.filter(conv => {
        return (!selectedGroup || (conv.group && conv.group === selectedGroup) ||
                (selectedGroup == "*" && conv.is_favorite)) &&
                (!searchText || (conv.title && conv.title.toLowerCase().includes(searchText)));
    });

    let currentGroup = null;

    filteredData.forEach((conv) => {
        // Check if the conversation belongs to a new group
        if (conv.group !== currentGroup) {
            currentGroup = conv.group;

            // Add a group title to the sidebar
            sidebar.insertAdjacentHTML("beforeend", `
                <div class="p-2 text-gray-700 font-bold">
                    ${currentGroup || "No Group"}
                </div>
            `);
        }
    
        sidebar.insertAdjacentHTML("beforeend", `
            <div class="p-2 hover:bg-gray-300 cursor-pointer flex justify-between relative group" id="conv-${conv.id}">
            <div class="inline-flex items-center">
                <span class="mr-2">${conv.title}</span>
                <small class="text-gray-500 whitespace-nowrap">${conv.total_length}</small>
            </div> 
                <small class="text-gray-500 whitespace-nowrap" title="${conv.created.split(' ')[1]}">${conv.created.split(' ')[0]}</small>
        
                <div class="absolute right-20 top-0 pt-1 pr-1 group-hover:opacity-100 cursor-pointer heart-div ${conv.is_favorite ? "is-favorite" : ""}" onclick="handleHeartClick('${conv.id}')">
                    <span class="material-symbols-outlined heart-icon" style="font-variation-settings: 'opsz' 48; vertical-align: middle; font-size: 24px !important;">favorite</span>
                </div>
            </div>
        `);
    
        document.getElementById(`conv-${conv.id}`).addEventListener("click", function () {
            loadChatMessages(conv.id);

            unSelectConversation();
            this.classList.add("bg-gray-400");
            selectedConvElem = this;
        });
    });
}

async function handleHeartClick(convId) {
    try {
        const response = await fetch(`/api/toggle_favorite?conv_id=${convId}`, {
            method: "POST",
        });
        const data = await response.json();

        // Update the conversationData array
        const conversation = conversationData.find(conv => conv.id === convId);
        if (conversation) {
            conversation.is_favorite = data.is_favorite;
        }
        
        // Update the UI based on the new favorite status
        const heartContainer = document.querySelector(`#conv-${convId} .heart-div`);
        if (data.is_favorite) {
            heartContainer.classList.add("is-favorite");
        } else {
            heartContainer.classList.remove("is-favorite");
        }
    } catch (error) {
        console.error("No se pudo cambiar el estado de favorito:", error);
    }
}

async function loadChatMessages(convId) {
    try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(convId)}/messages`);
        const data = await response.json();

        const mainContent = document.getElementById("main-content");

        // Limpiar el contenido existente
        mainContent.innerHTML = "";

        document.getElementById("main-content").style.display = "block";


        // Populate the main content with messages
        const messages = data.messages;
        let bgColorIndex = 0;
        messages.forEach((msg) => {
            const bgColorClass = bgColorIndex % 2 === 0 ? '' : 'bg-gray-200';
            mainContent.insertAdjacentHTML('beforeend', `
                <div class="p-2 border-b ${bgColorClass}">
                    <small class="text-gray-500">${msg.role == "internal" ? "" : msg.created}</small>
                    <br/>
                    <strong>${msg.role == "internal" ? "" : msg.role + ":"}</strong>
                    <span class="${msg.role == "internal" ? "text-gray-400" : ""}">${msg.text}</span>
                </div>
            `);
            if (msg.role !== "internal") {
                bgColorIndex++;
            }
    });

        scrollToTop();
    } catch (error) {
        console.error("No se pudieron cargar los mensajes:", error);
    }
}

async function searchConversations(query) { 
    try { 
        document.getElementById("main-content").style.display = "block";
        const mainContent = document.getElementById("main-content");
        
        mainContent.innerHTML = `
            <div class="p-2 pt-8">
                Búscando...
                <span class="material-symbols-outlined" 
                    style="font-variation-settings: 'opsz' 48; 
                    vertical-align: sub; font-size: 18px !important">hourglass_top</span>
            </div>
        `;

        const response = await fetch(`/api/search?query=${query}`);
        const data = await response.json();

        mainContent.innerHTML = ""; // Clear previous messages

        if (data.length === 0) {
            // if msg is empty, display a message
            mainContent.insertAdjacentHTML('beforeend', `
                <div class="p-2 pt-8">
                    No results found.
                </div>
            `);
        }
        else{
            data.forEach((msg, index) => {
                const bgColorClass = index % 2 === 0 ? '' : 'bg-gray-200';
                mainContent.insertAdjacentHTML('beforeend', `
                    <div class="p-2 border-b pb-12 ${bgColorClass}">
                        <div><u>${msg.title}</u></div>
                        <strong>${msg.role}:</strong>
                        <span>${msg.text}</span>
                        <small class="text-gray-500">${msg.created}</small>
                    </div>
                `);
            });
        }

        scrollToTop();
        unSelectConversation();
    } catch (error) {
        console.error("Search failed:", error);
    }
}


// Scroll to the top of the main content area
function scrollToTop() {
    document.getElementById("main-content-wrapper").scrollTop = 0;
}

// Remove background color from previously selected conversation
function unSelectConversation() {
    if (selectedConvElem) {
        selectedConvElem.classList.remove("bg-gray-400");
    }
}

// Listen for Enter key press on searchInput element
function handleSearchInput(event) {
    if (event.key !== "Enter")
        return;

    const query = encodeURIComponent(document.getElementById("search-input").value);
    if (query)
        searchConversations(query);
}

async function enviarValores() {
    // Obtener los valores de los inputs de rango
    const relacion = document.getElementById("relationProgress").value;
    const conocimiento = document.getElementById("knowledgeProgress").value;
    const selectElement = document.getElementById('jsonSelect');
    const selectedValue = selectElement.value;

    try {
        const response = await fetch("/api/guardar_valor_evaluacion", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                relacion: parseInt(relacion, 10),
                conocimiento: parseInt(conocimiento, 10),
                nombre: selectedValue
            })
        });

        const result = await response.json();
        if (response.ok) {
            // Cambiar el ícono a uno de éxito
            document.getElementById("statusIcon").innerHTML = "check_circle";
            document.getElementById("statusIcon").classList.remove("text-gray-500");
            document.getElementById("statusIcon").classList.remove("text-red-500");
            document.getElementById("statusIcon").classList.add("text-green-500");
            document.getElementById("statusText").textContent = "Guardados";

            document.getElementById("relationLabel").innerHTML = `% Relación con la asignatura - ${relacion}% <span class="material-symbols-outlined icons" style="font-size: 1.15rem;">check_circle</span>`;
            document.getElementById("knowledgeLabel").innerHTML = `% Conocimiento sobre la asignatura - ${conocimiento}% <span class="material-symbols-outlined icons" style="font-size: 1.15rem;">check_circle</span>`;

            document.getElementById("jsonSelect").classList.add("border-green-200");

            const option = document.querySelector(`option[value="${selectedValue}"]`);
            option.classList.add("bg-green-200");

            document.getElementById("boton_elim").classList.remove("disabled");
        } else {
            // Cambiar el ícono a uno de error
            document.getElementById("statusIcon").innerHTML = "error";
            document.getElementById("statusIcon").classList.remove("text-gray-500");
            document.getElementById("statusIcon").classList.remove("text-green-500");
            document.getElementById("statusIcon").classList.add("text-red-500");
            document.getElementById("statusText").textContent = "Error al guardar";

            document.getElementById("boton_elim").classList.add("disabled");
        }
    } catch (error) {
        console.error("Error en la solicitud:", error);
        document.getElementById("statusIcon").innerHTML = "error";
        document.getElementById("statusIcon").classList.remove("text-gray-500");
        document.getElementById("statusIcon").classList.remove("text-green-500");
        document.getElementById("statusIcon").classList.add("text-red-500");
        document.getElementById("statusText").textContent = "Error en la comunicación";

        document.getElementById("boton_elim").classList.add("disabled");
    }
}


async function eliminarValores() {
    try {
        // Envía una solicitud al servidor para eliminar los valores guardados
        const response = await fetch('/api/eliminar_valor_evaluacion', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: document.getElementById('jsonSelect').value })
        });
        
        if (response.ok) {
            document.getElementById('statusIcon').textContent = 'delete_forever';
            document.getElementById('statusIcon').classList.remove('text-gray-500');
            document.getElementById('statusIcon').classList.remove('text-green-500');
            document.getElementById('statusIcon').classList.add('text-red-500');
            document.getElementById('statusText').textContent = 'Valores eliminados';

            document.getElementById("relationLabel").textContent = '% Relación con la asignatura';
            document.getElementById("knowledgeLabel").textContent = '% Conocimiento sobre la asignatura';

            document.getElementById("jsonSelect").classList.remove("border-green-200");
            const selectElement = document.getElementById('jsonSelect');
            const selectedValue = selectElement.value;
            const option = document.querySelector(`option[value="${selectedValue}"]`);
            option.classList.remove("bg-green-200");

            document.getElementById("boton_elim").classList.add("disabled");
        } else {
            throw new Error('Error al eliminar valores');
        }
    } catch (error) {
        console.error('No se pudieron eliminar los valores:', error);
    }
}

window.addEventListener('DOMContentLoaded', (event) => {
    loadJsonFiles();

    document.getElementById("search-input").addEventListener("keydown", handleSearchInput);
    document.getElementById("groupFilter").addEventListener("change", populateConversationsList);
    document.getElementById("textFilter").addEventListener("input", populateConversationsList);
});


