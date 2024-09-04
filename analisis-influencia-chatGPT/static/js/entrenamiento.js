//Volver atras
function volverPaginaAnalisis() {
    window.location.href = '/templates/analisis.html';
}

function transicionPrediccion() {
    document.getElementById('transicionP').classList.add('slide-in-left');
}

//Pagina conversaciones
function pagina_conversaciones() {
    window.location.href = '/templates/conversaciones.html';
}

async function caracteristicas() {
    fetch('/api/obtener_caracteristicas')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if(data.hayResultados == 1){
                const selectCaracteristicas = data.caracteristicas;
                const selectElement = document.getElementById('select-caracteristicas');
                selectCaracteristicas.forEach(caract => {
                    const option = document.createElement('option');
                    option.value = caract;
                    option.textContent = caract;
                    selectElement.appendChild(option);
                });
            }
            const selectEtiqueta = data.etiquetas;
            const selectElement2 = document.getElementById('select-etiqueta');
            selectEtiqueta.forEach(caract => {
                const option = document.createElement('option');
                option.value = caract;
                option.textContent = caract;
                selectElement2.appendChild(option);
            });
        })
        .catch(error => console.error('Error al establecer las características:', error));
}


async function enviarDatos() {
    const metodo = document.querySelector("#select-entrenamiento").value;
    const caracteristicas = Array.from(document.querySelector("#select-caracteristicas").selectedOptions).map(option => option.value);
    const etiqueta = document.querySelector("#select-etiqueta").value;
    const porcentaje_prueba = document.querySelector("#input").value;

    // Verificar si caracteristicas está vacío
    if (caracteristicas.length === 0) {
        alert("Por favor, selecciona al menos una característica.");
        return;  // Detener la ejecución si no hay características seleccionadas
    }

    const datos = {
        metodo: metodo,
        caracteristicas: caracteristicas,
        etiqueta: etiqueta,
        porcentaje_prueba: Math.round(parseFloat(porcentaje_prueba))
    };

    console.log(datos);

    await fetch('/api/entrenar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            const selectedMetodo = data.metodo;
            const selectedCaracteristicas = data.caracteristicas.join(', ');
            const selectedEtiqueta = data.etiqueta;
            const selectedPorcentaje = data.porcentaje_prueba;
            const accuracy = data.accuracy;

            // Crear un nuevo div para los resultados
            const newResultDiv = document.createElement('div');
            newResultDiv.classList.add('results-container');
            newResultDiv.id = `results-${Date.now()}`;  // Asignar un ID único
            newResultDiv.innerHTML = `
                    <h2><u>Resultados de testeo/evaluación</u></h2>
                    <p><strong>Método:</strong> <span>${selectedMetodo}</span></p>
                    <p><strong>Características seleccionadas:</strong> <span>${selectedCaracteristicas}</span></p>
                    <p><strong>Etiqueta seleccionada:</strong> <span>${selectedEtiqueta}</span></p>
                    <p><strong>Porcentaje de prueba:</strong> <span>${selectedPorcentaje}</span>%</p>
                    <p><strong>RMSE (Raíz del Error Cuadrático Medio):</strong> <span>${accuracy}</span></p>
                    <div class="boton-predecir">
                    <button class="bg-black text-xl p-2 rounded w-full text-white" id="predecir-button" onclick="mostrarFormularioPrediccion('${selectedCaracteristicas}', '${selectedMetodo}', '${selectedEtiqueta}', '${selectedPorcentaje}', '${newResultDiv.id}')">Predecir</button>
                    </div>
                `;

            // Añadir el nuevo div al principio del contenedor de resultados
            const allResults = document.getElementById('all-results');
            
            allResults.insertBefore(newResultDiv, allResults.firstChild);
            
            // Desplazar el contenedor hacia el final
            document.getElementById('analisis').scrollTo({
                top: 135,
                behavior: 'smooth'
            });
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

// Variables globales para almacenar los parámetros
    let globalCaracteristicas = '';
    let globalMetodo = '';
    let globalEtiqueta = '';
    let globalPorcentaje = '';
    let globalResultadoId = '';

function mostrarFormularioPrediccion(caracteristicas, metodo, etiqueta, porcentaje, resultadoId) {
    // Guardar los parámetros en las variables globales
    globalMetodo = metodo;
    globalEtiqueta = etiqueta;
    globalPorcentaje = porcentaje;
    globalResultadoId = resultadoId;

    // Dividir las características para crear campos de entrada
    const caracteristicasArray = caracteristicas.split(', ');
    const formPrediccion = document.getElementById('formPrediccion');
    
    // Limpiar el formulario anterior
    formPrediccion.innerHTML = '';
    
    // Crear campos de entrada para cada característica
    caracteristicasArray.forEach(caracteristica => {
        const label = document.createElement('label');
        label.innerHTML = `<strong>${caracteristica}:</strong>`;
        label.style.display = 'block'; // Asegura que el texto esté encima del input
        label.style.marginBottom = '5px'; // Añade espacio entre el texto y el input

        // Crear el campo de entrada
        const input = document.createElement('input');
        input.type = 'text';
        input.name = caracteristica;
        input.style.width = '100%';

        // Añadir los elementos al formulario
        formPrediccion.appendChild(label);
        formPrediccion.appendChild(input);
    });

    // Mostrar el modal
    document.getElementById('prediccionModal').style.display = 'block';
}

function cerrarFormularioPrediccion() {
    // Ocultar el modal
    document.getElementById('prediccionModal').style.display = 'none';
}

async function realizarPrediccion() {
    // Obtener los valores del formulario
    const formData = new FormData(document.getElementById('formPrediccion'));
    const valores = [];
    const caracteristicas = [];

    // Recopilar los valores y las características
    formData.forEach((value, key) => {
        valores.push(parseFloat(value)); // Suponiendo que los valores son numéricos
        caracteristicas.push(key);
    });

    // Construir el objeto de datos a enviar
    const datosPrediccion = {
        metodo: globalMetodo,
        caracteristicas: caracteristicas,
        etiqueta: globalEtiqueta,
        porcentaje_prueba: globalPorcentaje,
        valores: valores
    };

    console.log(datosPrediccion);

    // Realizar la predicción enviando datos al servidor
    await fetch('/api/predecir', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosPrediccion)
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);
        const prediccion = data.prediccion;
        const selectedCaracteristicas = data.caracteristicas;
        const selectedValores = data.valores;

        // Actualizar el contenedor de resultados correspondiente
        const resultDiv = document.getElementById(globalResultadoId);
        if (resultDiv) {
            let caracteristicasValoresHTML = '';
            for (let i = 0; i < selectedCaracteristicas.length; i++) {
                caracteristicasValoresHTML += `<li>${selectedCaracteristicas[i]}: ${selectedValores[i]}</li>`;
            }
            caracteristicasValoresHTML += '</ul>';

            const predictionResultDiv = document.createElement('div');
            predictionResultDiv.innerHTML = `
                ${caracteristicasValoresHTML}
                <p><strong>Resultados de la predicción: </strong><span>${prediccion}</span></p>
            `;
            resultDiv.appendChild(predictionResultDiv);
        }
    })
    .catch(error => {
        console.error("Error:", error);
    });

    // Ocultar el modal
    cerrarFormularioPrediccion();
}