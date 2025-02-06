// Función para redirigir a la página de estadísticas
function pagina_estadisticas() {
    window.location.href = '/templates/conversaciones.html';
}

// Función para redirigir a la página de predicción
function pagina_prediccion() {
    window.location.href = '/templates/entrenamiento.html';
}

// Función para aplicar una transición
function transicionCorrelacion() {
    document.getElementById('transicionC').classList.add('slide-in-left');
}

// Función para mostrar la sección de ayuda y ocultar la sección de análisis
function ayuda() {
    document.getElementById('help-container').style.display = 'block';
    document.getElementById('ayuda_header').style.display = 'block';
    document.getElementById('analisis').style.display = 'none';
    document.getElementById('ayuda-link').style.color = '#abebc6'; // Cambiar color del enlace de ayuda
    document.getElementById('analisisLink').style.color = 'white'; // Restaurar color del enlace de análisis
    document.getElementById('correlacionLink').style.color = 'white'; // Restaurar color del enlace de correlación
}

// Función para generar y mostrar los gráficos
async function analisis() {
    // Realizar una solicitud fetch para obtener los datos de la API
    fetch('/api/generar_datos')
    .then(response => response.json())
    .then(data => {
    // Procesar los datos
        console.log(data);
        const promedioMensajes = data.promedio_mensajes; // Promedio de mensajes por alumno
        const longitudMensajes = data.longitud_promedio; // Longitud promedio de los mensajes
        const dispersionMensajes = data.dispersion_promedio; // Dispersión promedio de los mensajes
        const notas = data.nota; // Notas de los alumnos
        const json_files = data.filename; // Nombres de los archivos JSON
        const cc_pm = data.cc_pm; // Coeficientes de correlación para el promedio de mensajes
        const cc_lp = data.cc_lp; // Coeficientes de correlación para la longitud promedio
        const cc_dp = data.cc_dp; // Coeficientes de correlación para la dispersión promedio
        const hayAlumnosEvaluados = data.hayEvaluacion; // Indicador de si hay alumnos evaluados
        const hayAtributosCalculados = data.hayResultados; // Indicador de si hay atributos calculados

        // Crear gráficos para el promedio de mensajes
        const chartsContainer1 = document.getElementById('charts-container-1');

        // Crear gráfico con cada tipo de nota
        Object.keys(notas).forEach((columna, index) => {
            const nota = notas[columna]; // Almacenar notas de un tipo de nota
            const correlation = cc_pm[index] // Coeficiente de correlación correspondiente
            const dataArray = []; // Array para almacenar los datos de la gráfica

            // Preparar los datos para la gráfica
            for (let i = 0; i < promedioMensajes.length; i++) {
                dataArray.push({
                    x: promedioMensajes[i], // Promedio de mensajes
                    y: nota[i] // Nota correspondiente
                });
            }

            // Crear un contenedor para la gráfica
            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'chart-wrapper';
            const chartCanvas = document.createElement('canvas');
            chartWrapper.appendChild(chartCanvas);
            chartsContainer1.appendChild(chartWrapper);

            // Mostrar el coeficiente de correlación
            const cc = document.createElement('p');
            cc.className = 'correlation';
            cc.textContent = 'Coeficiente de correlación: ' + correlation;
            chartsContainer1.appendChild(cc);

            // Crear la gráfica utilizando Chart.js
            new Chart(chartCanvas.getContext('2d'), {
                type: 'scatter', // Tipo de gráfica: dispersión
                data: {
                    labels: json_files, // Etiquetas (nombres de archivos)
                    datasets: [{
                        label: `${columna}`, // Etiqueta del conjunto de datos (Nombre del tipo de nota)
                        data: dataArray, // Datos
                        backgroundColor: 'rgba(255, 99, 132, 0.5)', // Color de fondo de los puntos
                        borderColor: 'rgba(255, 99, 132, 1)', // Color del borde de los puntos
                        borderWidth: 1 // Ancho del borde
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: `Gráfico de Correlación (${columna}/Promedio de Mensajes)` // Título de la gráfica
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear', // Eje X lineal
                            position: 'bottom', // Posición del eje X
                            title: {
                                display: true,
                                text: 'Promedio de Mensajes' // Título del eje X
                            }
                        },
                        y: {
                            type: 'linear', // Eje Y lineal
                            position: 'left', // Posición del eje Y
                            title: {
                                display: true,
                                text: 'Nota' // Título del eje Y
                            }
                        }
                    }
                }
            });
        });

        // Crear gráficos para la longitud promedio de los mensajes
        const chartsContainer2 = document.getElementById('charts-container-2');

        Object.keys(notas).forEach((columna, index) => {
            const nota = notas[columna];
            const correlation = cc_lp[index];
            const dataArray = [];
            for (let i = 0; i < longitudMensajes.length; i++) {
                dataArray.push({
                    x: longitudMensajes[i],
                    y: nota[i] 
                });
            }

            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'chart-wrapper';
            const chartCanvas = document.createElement('canvas');
            chartWrapper.appendChild(chartCanvas);
            chartsContainer2.appendChild(chartWrapper);

            const cc = document.createElement('p');
            cc.className = 'correlation';
            cc.textContent = 'Coeficiente de correlación: ' + correlation;
            chartsContainer2.appendChild(cc);

            // Crear la gráfica utilizando Chart.js
            new Chart(chartCanvas.getContext('2d'), {
                type: 'scatter',
                data: {
                    labels: json_files,
                    datasets: [{
                        label: `${columna}`,
                        data: dataArray,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: `Gráfico de Correlación (${columna}/Longitud Promedio de Mensajes)`
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: {
                                display: true,
                                text: 'Longitud Promedio de mensajes'
                            }
                        },
                        y: {
                            type: 'linear',
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Nota'
                            }
                        }
                    }
                }
            });
        });

        // Crear gráficos para la dispersión promedio de los mensajes
        const chartsContainer3 = document.getElementById('charts-container-3');

        Object.keys(notas).forEach((columna, index) => {
            const nota = notas[columna];
            const correlation = cc_dp[index]
            const dataArray = [];
            for (let i = 0; i < dispersionMensajes.length; i++) {
                dataArray.push({
                    x: dispersionMensajes[i],
                    y: nota[i] 
                });
            }

            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'chart-wrapper';
            const chartCanvas = document.createElement('canvas');
            chartWrapper.appendChild(chartCanvas);
            chartsContainer3.appendChild(chartWrapper);

            const cc = document.createElement('p');
            cc.className = 'correlation';
            cc.textContent = 'Coeficiente de correlación: ' + correlation;
            chartsContainer3.appendChild(cc);

            // Crear la gráfica utilizando Chart.js
            new Chart(chartCanvas.getContext('2d'), {
                type: 'scatter',
                data: {
                    labels: json_files,
                    datasets: [{
                        label: `${columna}`,
                        data: dataArray,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: `Gráfico de Correlación (${columna}/Dispersion Promedio de Mensajes)`
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: {
                                display: true,
                                text: 'Dispersion Promedio de mensajes'
                            }
                        },
                        y: {
                            type: 'linear',
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Nota'
                            }
                        }
                    }
                }
            });
        });

        // Mostrar gráficos adicionales si hay alumnos evaluados
        if (hayAlumnosEvaluados == 1) {
            document.getElementById('container2').style.display = 'block';
            const json_Eval = data.evaluacion_results['json']; // Nombres de los archivos JSON evaluados
            const notas_Eval = data.evaluacion_results['nota']; // Notas de los alumnos evaluados
            const relacion_Eval = data.evaluacion_results['relacion']; // Valores % relación de los alumnos evaluados
            const conocimiento_Eval = data.evaluacion_results['conocimiento']; // Valores % conocimiento de los alumnos evaluados
            const cc_r_e = data.cc_r_e; // Coeficientes de correlación de % relación con las notas
            const cc_c_e = data.cc_c_e; // Coeficientes de correlación de % conocimiento con las notas

            // Crear gráficos para % relación con la asignatura
            const chartsContainer4 = document.getElementById('charts-container-4');

            Object.keys(notas_Eval).forEach((columna, index) => {
                const nota = notas_Eval[columna];
                const correlation = cc_r_e[index]
                const dataArray = [];
                for (let i = 0; i < relacion_Eval.length; i++) {
                    dataArray.push({
                        x: relacion_Eval[i],
                        y: nota[i] 
                    });
                }

                const chartWrapper = document.createElement('div');
                chartWrapper.className = 'chart-wrapper';
                const chartCanvas = document.createElement('canvas');
                chartWrapper.appendChild(chartCanvas);
                chartsContainer4.appendChild(chartWrapper);

                const cc = document.createElement('p');
                cc.className = 'correlation';
                cc.textContent = 'Coeficiente de correlación: ' + correlation;
                chartsContainer4.appendChild(cc);

                // Crear la gráfica utilizando Chart.js
                new Chart(chartCanvas.getContext('2d'), {
                    type: 'scatter',
                    data: {
                        labels: json_Eval,
                        datasets: [{
                            label: `${columna}`,
                            data: dataArray,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: `Gráfico de Correlación (${columna}/% relación)`
                            }
                        },
                        scales: {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: {
                                    display: true,
                                    text: '% relación con asignatura'
                                }
                            },
                            y: {
                                type: 'linear',
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Nota'
                                }
                            }
                        }
                    }
                });
            });

            // Crear gráficos para % conocimiento sobre la asignatura
            const chartsContainer5 = document.getElementById('charts-container-5');

            Object.keys(notas_Eval).forEach((columna, index) => {
                const nota = notas_Eval[columna];
                const correlation = cc_c_e[index];
                const dataArray = [];
                for (let i = 0; i < conocimiento_Eval.length; i++) {
                    dataArray.push({
                        x: conocimiento_Eval[i],
                        y: nota[i]
                    });
                }

                const chartWrapper = document.createElement('div');
                chartWrapper.className = 'chart-wrapper';
                const chartCanvas = document.createElement('canvas');
                chartWrapper.appendChild(chartCanvas);
                chartsContainer5.appendChild(chartWrapper);

                const cc = document.createElement('p');
                cc.className = 'correlation';
                cc.textContent = 'Coeficiente de correlación: ' + correlation;
                chartsContainer5.appendChild(cc);

                // Crear la gráfica utilizando Chart.js
                new Chart(chartCanvas.getContext('2d'), {
                    type: 'scatter',
                    data: {
                        labels: json_Eval,
                        datasets: [{
                            label: `${columna}`,
                            data: dataArray,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: `Gráfico de Correlación (${columna}/% conocimiento)`
                            }
                        },
                        scales: {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: {
                                    display: true,
                                    text: '% conocimiento sobre la asignatura'
                                }
                            },
                            y: {
                                type: 'linear',
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Nota'
                                }
                            }
                        }
                    }
                });
            });
        }else{
            document.getElementById('container2').style.display = 'none';
        }

        // Mostrar gráficos adicionales si hay atributos calculados
        if (hayAtributosCalculados == 1) {
            document.getElementById('container3').style.display = 'block';
            const json_Atrib = data.atributos_results['json'];  // Nombres de los archivos JSON que tienen atributos calculados
            const notas_Atrib = data.atributos_results['nota']; // Notas de los alumnos que tienen atributos calculados
            const relacion_Atrib = data.atributos_results['relacion']; // Valor % relación de los alumnos que tienen atributos calculados
            const conocimiento_Atrib = data.atributos_results['conocimiento']; // Valor % conocimiento de los alumnos que tienen atributos calculados
            const cc_r = data.cc_r; // Coeficientes de correlación de % relación con las notas
            const cc_c = data.cc_c; // Coeficientes de correlación de % conocimiento con las notas

            // Gráficos para el % de relación con la asignatura
            const chartsContainer6 = document.getElementById('charts-container-6');

            Object.keys(notas_Atrib).forEach((columna, index) => {
                const nota = notas_Atrib[columna];
                const correlation = cc_r[index]
                const dataArray = [];
                for (let i = 0; i < relacion_Atrib.length; i++) {
                    dataArray.push({
                        x: relacion_Atrib[i],
                        y: nota[i] 
                    });
                }

                const chartWrapper = document.createElement('div');
                chartWrapper.className = 'chart-wrapper';
                const chartCanvas = document.createElement('canvas');
                chartWrapper.appendChild(chartCanvas);
                chartsContainer6.appendChild(chartWrapper);

                const cc = document.createElement('p');
                cc.className = 'correlation';
                cc.textContent = 'Coeficiente de correlación: ' + correlation;
                chartsContainer6.appendChild(cc);

                // Crear la gráfica utilizando Chart.js
                new Chart(chartCanvas.getContext('2d'), {
                    type: 'scatter',
                    data: {
                        labels: json_Atrib,
                        datasets: [{
                            label: `${columna}`,
                            data: dataArray,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: `Gráfico de Correlación (${columna}/% relación)`
                            }
                        },
                        scales: {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: {
                                    display: true,
                                    text: '% relación con asignatura'
                                }
                            },
                            y: {
                                type: 'linear',
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Nota'
                                }
                            }
                        }
                    }
                });
            });

            // Gráficos para el % de conocimiento sobre la asignatura
            const chartsContainer7 = document.getElementById('charts-container-7');

            Object.keys(notas_Atrib).forEach((columna, index) => {
                const nota = notas_Atrib[columna];
                const correlation = cc_c[index];
                const dataArray = [];
                for (let i = 0; i < conocimiento_Atrib.length; i++) {
                    dataArray.push({
                        x: conocimiento_Atrib[i],
                        y: nota[i] 
                    });
                }

                const chartWrapper = document.createElement('div');
                chartWrapper.className = 'chart-wrapper';
                const chartCanvas = document.createElement('canvas');
                chartWrapper.appendChild(chartCanvas);
                chartsContainer7.appendChild(chartWrapper);

                const cc = document.createElement('p');
                cc.className = 'correlation';
                cc.textContent = 'Coeficiente de correlación: ' + correlation;
                chartsContainer7.appendChild(cc);

                // Crear la gráfica utilizando Chart.js
                new Chart(chartCanvas.getContext('2d'), {
                    type: 'scatter',
                    data: {
                        labels: json_Atrib,
                        datasets: [{
                            label: `${columna}`,
                            data: dataArray,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)', 
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        plugins: {
                            title: {
                                display: true,
                                text: `Gráfico de Correlación (${columna}/% conocimiento)`
                            }
                        },
                        scales: {
                            x: {
                                type: 'linear',
                                position: 'bottom',
                                title: {
                                    display: true,
                                    text: '% conocimiento sobre la asignatura'
                                }
                            },
                            y: {
                                type: 'linear',
                                position: 'left',
                                title: {
                                    display: true,
                                    text: 'Nota'
                                }
                            }
                        }
                    }
                });
            });
        }else{
            document.getElementById('container3').style.display = 'none';
        }

    })
    .catch(error => console.error('Error al generar las gráficas:', error));
}