// Variable global para almacenar las conversaciones
let conversationData = null;

// Función para redirigir a la página de correlación
function pagina_correlacion() {
    window.location.href = '/templates/analisis.html';
}

// Función para redirigir a la página de predicción
function pagina_prediccion() {
    window.location.href = '/templates/entrenamiento.html';
}

// Función para mostrar la sección de ayuda y ocultar el contenido principal
function ayuda() {
    document.getElementById('help-container').style.display = 'block';
    document.getElementById('ayuda_header').style.display = 'block';
    document.getElementById('container').style.display = 'none';
    document.getElementById('search-input').style.display = 'none';

    // Cambiar colores de los enlaces para resaltar la ayuda
    document.getElementById('ayuda-link').style.color = '#abebc6';
    document.getElementById('analisisLink').style.color = 'white';
    document.getElementById('estadisticasLink').style.color = 'white';
}

// Función para manejar la selección de una conversación
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

                // Mostrar graficos y ocultar demás pantallas
                document.getElementById("main-content").style.display = "none";
                document.getElementById("grafics").style.display = "block";

                // Cargar datos relacionados con la conversación
                loadConversations();
                loadActivityStats();
                loadChatStatistics();
                loadNotes();
                loadValorEvaluacion();
                loadAtribIA();
                scrollToTop();

            })
            .catch(error => console.error('No se pudieron cargar las conversaciones:', error));
    }
}

// Obtiene la lista de archivos JSON disponibles en el backend y los carga en un selector
async function loadJsonFiles() {
    fetch("/api/json-files")
        .then(response => response.json())
        .then(data => {
            const jsonFiles = data.json_files; // Obtener la lista de archivos JSON
            const selectElement = document.getElementById('jsonSelect');

            // Agregar las opciones al selector de archivos JSON
            jsonFiles.forEach(jsonFile => {
                const option = document.createElement('option');
                option.value = jsonFile;
                option.textContent = jsonFile;
                selectElement.appendChild(option);
            });
            // Preseleccionar la primera opción
            if (jsonFiles.length > 0) {
                selectElement.value = jsonFiles[0];
                handleConversationSelect();
            }
        })
        .catch(error => console.error('Error cargando conversacion:', error));
}

// Función para cargar las conversaciones desde el backend
async function loadConversations() {
    try {
        const response = await fetch("/api/conversations");
        conversationData = await response.json(); // Almacena las conversaciones del alumno seleccionado

        // Llenar el desplegable de grupos y la lista de conversaciones
        populateGroupDropdown(conversationData);
        populateConversationsList();
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

let selectedConvElem = null;  // Variable global para rastrear la conversación seleccionada

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
        const response = await fetch(`/api/conversations/${encodeURIComponent(convId)}/messages`);
        const data = await response.json();

        const mainContent = document.getElementById("main-content");

        // Limpiar el contenido existente
        mainContent.innerHTML = "";

        // Ocultar gráficas y mostrar la sección de mensajes
        document.getElementById("grafics").style.display = "none";
        document.getElementById("main-content").style.display = "block";

        // Botón para regresar a la vista de gráficas
        mainContent.innerHTML = `
            <div class="p-2 border-b text-left">
                <a href="#" class="icon-group" onclick="handleConversationSelect()">
                    <span class="material-symbols-outlined icons" style="font-variation-settings: 'opsz' 48; vertical-align: sub; font-size: 18px !important">bar_chart</span>
                    Volver a las gráficas
                </a>
            </div>
        `;

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

// Función para cargar las estadísticas de actividad
async function loadActivityStats() {
    try {
        // Realiza una solicitud para obtener los datos de la actividad
        const response = await fetch("/api/activity");
        const data = await response.json();

        // Construir el gráfico de actividad y la barra de actividad
        buildActivityGraph(document.getElementById("activity-graph"), { data: data });
        buildActivityBarChart(data);
    } catch (error) {
        // En caso de error, mostrar un mensaje en la consola
        console.error("No se pudo cargar el gráfico de actividad:", error);
    }
}

// Función para cargar las estadísticas del chat
async function loadChatStatistics() {
    try {
        // Realiza una solicitud para obtener las estadísticas de la conversación
        const response = await fetch('/api/statistics');
        const data = await response.json();
        const tableContainer = document.getElementById('chat-statistics');

        // Limpiar estadisticas
        tableContainer.innerHTML = '';

        // Crear la cabecera y las filas de la tabla
        let tableHTML = `
            <table class="min-w-full bg-white">
                <tbody>
        `;

        // Insertar filas en la tabla basadas en los datos obtenidos
        for (const [key, value] of Object.entries(data)) {
            tableHTML += `
                <tr>
                    <td class="py-2 px-4 border-b">${key}</td>
                    <td class="py-2 px-4 border-b">${value}</td>
                </tr>
            `;
        }

        // Cerrar las etiquetas de la tabla
        tableHTML += `
                </tbody>
            </table>
        `;

        // Insertar el HTML de la tabla en el contenedor
        tableContainer.insertAdjacentHTML("beforeend", tableHTML);
    } catch (error) {
        console.error("Error al obtener las estadísticas del chat:", error);
    }
}

// Función para cargar las notas de un alumno
async function loadNotes() {
    try {
        // Realiza una solicitud para obtener las notas
        const response = await fetch('/api/notes');
        const data = await response.json();
        const tableContainer = document.getElementById('notes');

        // Limpiar estadisticas
        tableContainer.innerHTML = '';

        // Crear la cabecera y las filas de la tabla
        let tableHTML = `
            <table class="min-w-full bg-white">
                <tbody>
        `;

        // Verificar si hay datos, en caso contrario mostrar un mensaje
        if (!data || Object.keys(data).length === 0) {
            tableHTML += `
                <p>No hay notas disponibles.</p>
            `;
        }else{
            // Insertar filas en la tabla basadas en los datos obtenidos
            for (const [key, value] of Object.entries(data)) {
                tableHTML += `
                    <tr>
                        <td class="py-2 px-4 border-b">${key}</td>
                        <td class="py-2 px-4 border-b">${value}</td>
                    </tr>
                `;
            }
        }

        // Cerrar las etiquetas de la tabla
        tableHTML += `
                </tbody>
            </table>
        `;

        // Insertar el HTML de la tabla en el contenedor
        tableContainer.insertAdjacentHTML("beforeend", tableHTML);
    } catch (error) {
        console.error("Error al obtener notas:", error);
    }
}

// Función para cargar el valor de evaluación del alumno
async function loadValorEvaluacion() {
    try {
        // Realiza una solicitud para obtener el valor de evaluación
        const response = await fetch('/api/valorEval');
        const data = await response.json();
        const tableContainer = document.getElementById('valor_eval');

        // Limpiar estadisticas
        tableContainer.innerHTML = '';

        // Crear la cabecera y las filas de la tabla
        let tableHTML = `
            <table class="min-w-full bg-white">
                <tbody>
        `;

        // Verificar si hay datos, en caso contrario mostrar un mensaje
        if (!data || Object.keys(data).length === 0) {
            tableHTML += `
                <p>No se ha evaluado este alumno.</p>
            `;
        }else{
            // Insertar las filas de la tabla con los valores de evaluación obtenidos
            tableHTML += `
                <tr>
                    <td class="py-2 px-4 border-b">Relación con la asignatura</td>
                    <td class="py-2 px-4 border-b">${data.relacion}%</td>
                </tr>
                <tr>
                    <td class="py-2 px-4 border-b">Conocimiento sobre la asignatura</td>
                    <td class="py-2 px-4 border-b">${data.conocimiento}%</td>
                </tr>
            `;
        }

        // Cerrar las etiquetas de la tabla
        tableHTML += `
                </tbody>
            </table>
        `;

        // Insertar el HTML de la tabla en el contenedor
        tableContainer.insertAdjacentHTML("beforeend", tableHTML);
    } catch (error) {
        console.error("Error fetching notes:", error);
    }
}

// Función para cargar los atributos de IA del alumno
async function loadAtribIA() {
    try {
        // Realiza una solicitud para obtener los atributos
        const response = await fetch('/api/atributos');
        const data = await response.json();
        const tableContainer = document.getElementById('atrib');

        // Limpiar estadisticas
        tableContainer.innerHTML = '';

        // Crear la cabecera y las filas de la tabla
        let tableHTML = `
            <table class="min-w-full bg-white">
                <tbody>
        `;

        // Verificar si hay datos, en caso contrario mostrar un mensaje
        if (!data || Object.keys(data).length === 0) {
            tableHTML += `
                <p>No existen atributos calculados para este alumno.</p>
            `;
        }else{
            // Insertar las filas de la tabla con los atributos obtenidos
            tableHTML += `
                <tr>
                    <td class="py-2 px-4 border-b">Relación con la asignatura</td>
                    <td class="py-2 px-4 border-b">${data.relacion}%</td>
                </tr>
                <tr>
                    <td class="py-2 px-4 border-b">Conocimiento sobre la asignatura</td>
                    <td class="py-2 px-4 border-b">${data.conocimiento}%</td>
                </tr>
            `;
        }

        // Cerrar las etiquetas de la tabla
        tableHTML += `
                </tbody>
            </table>
        `;

        // Insertar el HTML de la tabla en el contenedor
        tableContainer.insertAdjacentHTML("beforeend", tableHTML);
    } catch (error) {
        console.error("Error fetching notes:", error);
    }
}

// Función para buscar conversaciones
async function searchConversations(query) { 
    try { 
        // Ocultar gráficos y mostrar el contenido principal mientras se realiza la búsqueda
        document.getElementById("grafics").style.display = "none";
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
        const response = await fetch(`/api/search?query=${query}`);
        const data = await response.json();

        mainContent.innerHTML = ""; // Limpiar contenido anterior

        // Crear el enlace para volver a las gráficas
        mainContent.innerHTML = `
            <div class="p-2 border-b text-left">
                <a href="#" class="icon-group" onclick="handleConversationSelect()">
                    <span class="material-symbols-outlined icons" style="font-variation-settings: 'opsz' 48; vertical-align: sub; font-size: 18px !important">bar_chart</span>
                    Volver a las gráficas
                </a>
            </div>
        `;

        // Si no se encuentran resultados, mostrar un mensaje indicando que no hay resultados
        if (data.length === 0) {
            mainContent.insertAdjacentHTML('beforeend', `
                <div class="p-2 pt-8">
                    Resultados no encontrados.
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

// Escuchar cuando la página haya cargado para ejecutar acciones específicas
window.addEventListener('DOMContentLoaded', (event) => {
    // Verificar si loas enlaces a las páginas correlación y predicción están habilitadas en la sesión
    let isCorrPredEnabled = sessionStorage.getItem('corrPredEnabled');

    if (isCorrPredEnabled === 'true') {
        // Habilitar el enlace si está guardado en localStorage
        document.getElementById("correlacionLink").classList.remove('disabled');
        document.getElementById("prediccionLink").classList.remove('disabled');
    } else {
        // Deshabilitar el enlace
        document.getElementById("correlacionLink").classList.add('disabled');
        document.getElementById("prediccionLink").classList.add('disabled');
    }

    // Cargar archivos JSON al cargar la página
    loadJsonFiles();

    // Agregar listeners para los eventos de búsqueda y filtros
    document.getElementById("search-input").addEventListener("keydown", handleSearchInput);
    document.getElementById("groupFilter").addEventListener("change", populateConversationsList);
    document.getElementById("textFilter").addEventListener("input", populateConversationsList);
});


