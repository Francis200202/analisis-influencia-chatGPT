// Variable global para almacenar las conversaciones
let conversationData = null;

// Escucha mensajes que se envían a la ventana
window.addEventListener("message", (event) => {
    if (event.data.action === "navigateConversation") {
        const direction = event.data.direction; // Obtener la dirección de navegación ("prev" o "next")

        // Cambiar al archivo de conversación anterior o siguiente
        changeSelectedFile(direction);
    }
});

// Función para cambiar el archivo de conversaciones seleccionado
function changeSelectedFile(direction) {
    const jsonSelect = document.getElementById("jsonSelect");
    const options = Array.from(jsonSelect.options); // Convertir las opciones del dropdown en un array
    const currentIndex = options.findIndex(option => option.value === jsonSelect.value); // Obtener el índice de la opción seleccionada actualmente

    // Navegar al archivo anterior
    if (direction === "prev" && currentIndex > 0) {
        // Seleccionar el archivo anterior
        jsonSelect.value = options[currentIndex - 1].value;
    }
    // Navegar al archivo siguiente
    else if (direction === "next" && currentIndex < options.length - 1) {
        // Seleccionar el archivo siguiente
        jsonSelect.value = options[currentIndex + 1].value;
    }
    // Si no hay más archivos en la dirección solicitada
    else {
        console.log("No hay más conversaciones en esta dirección.");
        return;
    }

    // Cargar la conversación seleccionada
    handleConversationSelect();
}

// Función para manejar la selección de una conversación
function handleConversationSelect() {
    const selectedFilePath = document.getElementById("jsonSelect").value;
    if (selectedFilePath) {
        const endpoint = `/api/load-conversations-predict?path=${encodeURIComponent(selectedFilePath)}`;
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

// Obtiene la lista de archivos JSON disponibles en el backend y los carga en un selector
async function loadJsonFiles() {
    try {
        // Comprobar si estan evaluados todos los alumnos
        const evaluados = await fetch("/api/estado-evaluacion-predict");
        const dataEv = await evaluados.json();
        if (dataEv.alumnosEvaluados == dataEv.totalAlumnos) {
            console.log("Enviando mensaje al padre: todos evaluados");
            console.log(dataEv.alumnosEvaluados);
            console.log(dataEv.totalAlumnos);
            // Enviar mensaje al padre para habilitar el botón de aceptar
            window.parent.postMessage({ action: "updateAcceptButton", state: true }, "*");
        } else {
            console.log("Enviando mensaje al padre: todos evaluados");
            console.log(dataEv.alumnosEvaluados);
            console.log(dataEv.totalAlumnos);
            // Enviar mensaje al padre para deshabilitar el botón de aceptar
            window.parent.postMessage({ action: "updateAcceptButton", state: false }, "*");
        }

        // Obtener la lista de archivos JSON
        const response = await fetch("/api/json-files-predict");
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
        const statusResponse = await fetch("/api/json-files-status-predict");
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

let selectedConvElem = null;  // Variable global para rastrear la conversación seleccionada

// Función para cargar las conversaciones desde el backend
async function loadConversations() {
    try {
        const response = await fetch("/api/conversations-predict");
        conversationData = await response.json(); // Almacena las conversaciones del alumno seleccionado

        // Llenar el desplegable de grupos y la lista de conversaciones
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

        // Obtener el nombre de la conversacion seleccionada
        const selectElement = document.getElementById('jsonSelect');
        const nombre = selectElement.value;

        // Solicitar valores de relación y conocimiento al servidor
        const valoresResponse = await fetch(`/api/obtener_valor_evaluacion_predict/${nombre}`);
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

// Llena el filtro de grupos con los nombres de los grupos de conversación disponibles
function populateGroupDropdown(conversations) {
    const groupSet = new Set();
    conversations.forEach(conv => {
        if (conv.group) {
            groupSet.add(conv.group);
        }
    });

    const groupFilterElem = document.getElementById("groupFilter");
    // Agregar las opciones
    Array.from(groupSet).forEach(group => {
        const optionElem = document.createElement("option");
        optionElem.value = group;
        optionElem.textContent = group;
        groupFilterElem.appendChild(optionElem);
    });
}

// Función para rellenar la lista de conversaciones en la barra lateral
function populateConversationsList() {
    const sidebar = document.getElementById("sidebar-conversations");
    sidebar.innerHTML = ""; // Limpiar conversaciones previas

    const selectedGroup = document.getElementById("groupFilter").value;
    const searchText = document.getElementById("textFilter").value.toLowerCase();
    
    // Aplicar filtros
    const filteredData = conversationData.filter(conv => {
        return (!selectedGroup || (conv.group && conv.group === selectedGroup) ||
                (selectedGroup == "*" && conv.is_favorite)) &&
                (!searchText || (conv.title && conv.title.toLowerCase().includes(searchText)));
    });

    let currentGroup = null;

    // Iterar sobre las conversaciones filtradas y agregarlas a la barra lateral
    filteredData.forEach((conv) => {
        // Verificar si la conversación pertenece a un nuevo grupo y agregar un encabezado
        if (conv.group !== currentGroup) {
            currentGroup = conv.group;

            // Add a group title to the sidebar
            sidebar.insertAdjacentHTML("beforeend", `
                <div class="p-2 text-gray-700 font-bold">
                    ${currentGroup || "No Group"}
                </div>
            `);
        }

        // Agregar cada conversación a la barra lateral
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

        // Agregar evento de clic a la conversación para cargar los mensajes
        document.getElementById(`conv-${conv.id}`).addEventListener("click", function () {
            loadChatMessages(conv.id);

            // Deseleccionar la conversación previamente seleccionada y resaltar la nueva
            unSelectConversation();
            this.classList.add("bg-gray-400");
            selectedConvElem = this;
        });
    });
}

// Función para marcar o desmarcar una conversación como favorita
async function handleHeartClick(convId) {
    try {
        const response = await fetch(`/api/toggle_favorite?conv_id=${convId}`, {
            method: "POST",
        });
        const data = await response.json();

        // Actualizar el estado de favorito
        const conversation = conversationData.find(conv => conv.id === convId);
        if (conversation) {
            conversation.is_favorite = data.is_favorite;
        }
        
        // Actualizar la interfaz de usuario con el nuevo estado de favorito
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

// Función para cargar los mensajes de una conversación seleccionada
async function loadChatMessages(convId) {
    try {
        const response = await fetch(`/api/conversations-predict/${encodeURIComponent(convId)}/messages`);
        const data = await response.json();

        const mainContent = document.getElementById("main-content");

        // Limpiar el contenido existente
        mainContent.innerHTML = "";

        document.getElementById("main-content").style.display = "block";


        // Iterar sobre los mensajes de la conversación y agregarlos al contenido principal
        const messages = data.messages;
        let bgColorIndex = 0;
        messages.forEach((msg) => {
            // Alternar colores de fondo para diferenciar mensajes
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
        // Desplazar la vista al inicio
        scrollToTop();
    } catch (error) {
        console.error("No se pudieron cargar los mensajes:", error);
    }
}

// Función para buscar conversaciones
async function searchConversations(query) { 
    try { 
        document.getElementById("main-content").style.display = "block";
        const mainContent = document.getElementById("main-content");

        // Mostrar mensaje de carga mientras se busca
        mainContent.innerHTML = `
            <div class="p-2 pt-8">
                Búscando...
                <span class="material-symbols-outlined" 
                    style="font-variation-settings: 'opsz' 48; 
                    vertical-align: sub; font-size: 18px !important">hourglass_top</span>
            </div>
        `;

        // Realizar la solicitud para obtener las conversaciones basadas en la consulta
        const response = await fetch(`/api/search-predict?query=${query}`);
        const data = await response.json();

        mainContent.innerHTML = ""; // Limpiar contenido anterior

        // Si no se encuentran resultados, mostrar un mensaje indicando que no hay resultados
        if (data.length === 0) {
            mainContent.insertAdjacentHTML('beforeend', `
                <div class="p-2 pt-8">
                    No results found.
                </div>
            `);
        }
        else {
            // Si hay resultados, mostrar cada mensaje en el contenido principal
            data.forEach((msg, index) => {
                // Alternar colores de fondo para mejorar la visibilidad
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
        // Hacer scroll hacia la parte superior del contenido principal
        scrollToTop();
        // Desmarcar una conversación previamente seleccionada
        unSelectConversation();
    } catch (error) {
        console.error("Search failed:", error);
    }
}


// Función para hacer scroll al inicio del contenido principal
function scrollToTop() {
    document.getElementById("main-content-wrapper").scrollTop = 0;
}

// Función para quitar el fondo de una conversación seleccionada previamente
function unSelectConversation() {
    if (selectedConvElem) {
        selectedConvElem.classList.remove("bg-gray-400");
    }
}

// Función para manejar la entrada de texto en el campo de búsqueda
function handleSearchInput(event) {
    // Solo ejecutar la búsqueda cuando se presiona la tecla Enter
    if (event.key !== "Enter")
        return;

    // Obtener el valor de la consulta y ejecutarla si no está vacía
    const query = encodeURIComponent(document.getElementById("search-input").value);
    if (query)
        searchConversations(query);
}

// Función que envía los valores de evaluación al servidor para ser guardados
async function enviarValores() {
    // Obtener los valores de los inputs de rango
    const relacion = document.getElementById("relationProgress").value;
    const conocimiento = document.getElementById("knowledgeProgress").value;
    const selectElement = document.getElementById('jsonSelect');
    const selectedValue = selectElement.value;

    try {
        // Realizar la solicitud POST para guardar los valores de evaluación
        const response = await fetch("/api/guardar_valor_evaluacion_predict", {
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

        // Procesar la respuesta del servidor
        const result = await response.json();
        if (response.ok) {
            // Si la solicitud fue exitosa, actualizar el ícono de estado a éxito
            document.getElementById("statusIcon").innerHTML = "check_circle";
            document.getElementById("statusIcon").classList.remove("text-gray-500");
            document.getElementById("statusIcon").classList.remove("text-red-500");
            document.getElementById("statusIcon").classList.add("text-green-500");
            document.getElementById("statusText").textContent = "Guardados";

            // Actualizar los textos de los labels con los valores de evaluación
            document.getElementById("relationLabel").innerHTML = `% Relación con la asignatura - ${relacion}% <span class="material-symbols-outlined icons" style="font-size: 1.15rem;">check_circle</span>`;
            document.getElementById("knowledgeLabel").innerHTML = `% Conocimiento sobre la asignatura - ${conocimiento}% <span class="material-symbols-outlined icons" style="font-size: 1.15rem;">check_circle</span>`;

            // Añadir una clase para resaltar el selector de archivos JSON
            document.getElementById("jsonSelect").classList.add("border-green-200");

            // Marcar el archivo JSON seleccionado con un fondo verde
            const option = document.querySelector(`option[value="${selectedValue}"]`);
            option.classList.add("bg-green-200");

            // Habilitar el botón de eliminación de valores
            document.getElementById("boton_elim").classList.remove("disabled");
        } else {
            // Si la solicitud no fue exitosa, mostrar un ícono de error
            document.getElementById("statusIcon").innerHTML = "error";
            document.getElementById("statusIcon").classList.remove("text-gray-500");
            document.getElementById("statusIcon").classList.remove("text-green-500");
            document.getElementById("statusIcon").classList.add("text-red-500");
            document.getElementById("statusText").textContent = "Error al guardar";

            // Deshabilitar el botón de eliminación
            document.getElementById("boton_elim").classList.add("disabled");
        }

        // Verificar si todos los alumnos han sido evaluados
        const evaluados = await fetch("/api/estado-evaluacion-predict");
        const dataEv = await evaluados.json();
        // Enviar mensaje al padre (ventana/iframe) para actualizar el estado del botón de aceptación
        if (dataEv.alumnosEvaluados === dataEv.totalAlumnos) {
            window.parent.postMessage({ action: "updateAcceptButton", state: true }, "*");
        } else {
            window.parent.postMessage({ action: "updateAcceptButton", state: false }, "*");
        }


    } catch (error) {
        // En caso de error, mostrar un ícono de error y deshabilitar el botón de eliminación
        console.error("Error en la solicitud:", error);
        document.getElementById("statusIcon").innerHTML = "error";
        document.getElementById("statusIcon").classList.remove("text-gray-500");
        document.getElementById("statusIcon").classList.remove("text-green-500");
        document.getElementById("statusIcon").classList.add("text-red-500");
        document.getElementById("statusText").textContent = "Error en la comunicación";

        // Deshabilitar el botón de eliminación
        document.getElementById("boton_elim").classList.add("disabled");
    }
}

// Función que elimina los valores de evaluación guardados
async function eliminarValores() {
    try {
        // Envía una solicitud al servidor para eliminar los valores guardados
        const response = await fetch('/api/eliminar_valor_evaluacion_predict', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: document.getElementById('jsonSelect').value })
        });
        
        if (response.ok) {
            // Si la eliminación fue exitosa, actualizar el ícono de estado a "eliminado"
            document.getElementById('statusIcon').textContent = 'delete_forever';
            document.getElementById('statusIcon').classList.remove('text-gray-500');
            document.getElementById('statusIcon').classList.remove('text-green-500');
            document.getElementById('statusIcon').classList.add('text-red-500');
            document.getElementById('statusText').textContent = 'Valores eliminados';

            // Restablecer los valores de los labels a su estado original
            document.getElementById("relationLabel").textContent = '% Relación con la asignatura';
            document.getElementById("knowledgeLabel").textContent = '% Conocimiento sobre la asignatura';

            // Eliminar el borde verde del selector de archivos JSON
            document.getElementById("jsonSelect").classList.remove("border-green-200");

            // Eliminar el fondo verde del archivo seleccionado
            const selectElement = document.getElementById('jsonSelect');
            const selectedValue = selectElement.value;
            const option = document.querySelector(`option[value="${selectedValue}"]`);
            option.classList.remove("bg-green-200");

            // Deshabilitar el botón de eliminación
            document.getElementById("boton_elim").classList.add("disabled");

            // Enviar mensaje al padre (ventana/iframe) para actualizar el estado del botón de aceptación
            window.parent.postMessage({ action: "updateAcceptButton", state: false }, "*");
        } else {
            throw new Error('Error al eliminar valores');
        }
    } catch (error) {
        console.error('No se pudieron eliminar los valores:', error);
    }
}

// Escuchar el evento de carga del DOM y ejecutar las funciones correspondientes
window.addEventListener('DOMContentLoaded', (event) => {
    // Cargar los archivos JSON disponibles al iniciar la página
    loadJsonFiles();

    // Agregar eventos a los elementos para manejar la búsqueda y los filtros
    document.getElementById("search-input").addEventListener("keydown", handleSearchInput);
    document.getElementById("groupFilter").addEventListener("change", populateConversationsList);
    document.getElementById("textFilter").addEventListener("input", populateConversationsList);
});


