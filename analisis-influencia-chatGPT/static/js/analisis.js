//Volver atras
function volverPaginaPrincipal() {
    window.location.href = '/templates/conversaciones.html';
}

function transicionCorrelacion() {
    document.getElementById('transicionC').classList.add('slide-in-left');
}

// Insertar los charts
async function analisis() {
    fetch('/api/generar_datos')
    .then(response => response.json())
    .then(data => {
    // Procesar los datos
        console.log(data);
        const promedioMensajes = data.promedio_mensajes;
        const longitudMensajes = data.longitud_promedio;
        const dispersionMensajes = data.dispersion_promedio;
        const notas = data.nota;
        const json_files = data.filename;
        const cc_pm = data.cc_pm;
        const cc_lp = data.cc_lp;
        const cc_dp = data.cc_dp;
        const hayAtributosCalculados = data.hayResultados;

        // Promedio del numero de mensajes
        const chartsContainer1 = document.getElementById('charts-container-1');

        Object.keys(notas).forEach((columna, index) => {
            const nota = notas[columna];
            const correlation = cc_pm[index]
            const dataArray = [];
            for (let i = 0; i < promedioMensajes.length; i++) {
                dataArray.push({
                    x: promedioMensajes[i],
                    y: nota[i] // Nota
                });
            }

            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'chart-wrapper';
            const chartCanvas = document.createElement('canvas');
            chartWrapper.appendChild(chartCanvas);
            chartsContainer1.appendChild(chartWrapper);

            const cc = document.createElement('p');
            cc.className = 'correlation';
            cc.textContent = 'Coeficiente de correlación: ' + correlation;
            chartsContainer1.appendChild(cc);

            // Crear la gráfica utilizando Chart.js
            new Chart(chartCanvas.getContext('2d'), {
                type: 'scatter',
                data: {
                    labels: json_files,
                    datasets: [{
                        label: `${columna}`,
                        data: dataArray,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)', // Color del punto
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    plugins: {
                        title: {
                            display: true,
                            text: `Gráfico de Correlación (${columna}/Promedio de Mensajes)`
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom',
                            title: {
                                display: true,
                                text: 'Promedio de Mensajes'
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

        //Promedio de la longitud de los mensajes
        const chartsContainer2 = document.getElementById('charts-container-2');

        Object.keys(notas).forEach((columna, index) => {
            const nota = notas[columna];
            const correlation = cc_lp[index];
            const dataArray = [];
            for (let i = 0; i < longitudMensajes.length; i++) {
                dataArray.push({
                    x: longitudMensajes[i],
                    y: nota[i] // Nota
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
                        backgroundColor: 'rgba(255, 99, 132, 0.5)', // Color del punto
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

        //Promedio de la dispersión de los mensajes
        const chartsContainer3 = document.getElementById('charts-container-3');

        Object.keys(notas).forEach((columna, index) => {
            const nota = notas[columna];
            const correlation = cc_dp[index]
            const dataArray = [];
            for (let i = 0; i < dispersionMensajes.length; i++) {
                dataArray.push({
                    x: dispersionMensajes[i],
                    y: nota[i] // Nota
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
                        backgroundColor: 'rgba(255, 99, 132, 0.5)', // Color del punto
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

        if (hayAtributosCalculados == 1) {
            document.getElementById('container2').style.display = 'block';
            const json_Atrib = data.atributos_results['json'];
            const notas_Atrib = data.atributos_results['nota'];
            const relacion_Atrib = data.atributos_results['relacion'];
            const conocimiento_Atrib = data.atributos_results['conocimiento'];
            const cc_r = data.cc_r;
            const cc_c = data.cc_c;

            // % de relación de las conversaciones con la asignatura
            const chartsContainer4 = document.getElementById('charts-container-4');

            Object.keys(notas_Atrib).forEach((columna, index) => {
                const nota = notas_Atrib[columna];
                const correlation = cc_r[index]
                const dataArray = [];
                for (let i = 0; i < relacion_Atrib.length; i++) {
                    dataArray.push({
                        x: relacion_Atrib[i],
                        y: nota[i] // Nota
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
                        labels: json_Atrib,
                        datasets: [{
                            label: `${columna}`,
                            data: dataArray,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)', // Color del punto
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

            //% de conocimiento sobre la asignatura
            const chartsContainer5 = document.getElementById('charts-container-5');

            Object.keys(notas_Atrib).forEach((columna, index) => {
                const nota = notas_Atrib[columna];
                const correlation = cc_c[index];
                const dataArray = [];
                for (let i = 0; i < conocimiento_Atrib.length; i++) {
                    dataArray.push({
                        x: conocimiento_Atrib[i],
                        y: nota[i] // Nota
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
                        labels: json_Atrib,
                        datasets: [{
                            label: `${columna}`,
                            data: dataArray,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)', // Color del punto
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
                                    text: '% conocimiento de la asignatura'
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

    })
    .catch(error => console.error('Error al generar las gráficas:', error));
}

//Pagina Entrenamiento
function pagina_entrenamiento() {
    window.location.href = '/templates/entrenamiento.html';
}