from fastapi import FastAPI, Query, Request, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

import sqlite3
import openai
import tiktoken
from datetime import datetime
from markdown import markdown
from collections import defaultdict
from openai import OpenAI
from dotenv import load_dotenv
import statistics
import os
import pandas as pd
import statsmodels.api as sm
import json

from pathlib import Path
import zipfile
import shutil

from history import load_conversations
from utils import time_group, human_readable_time
from llms import load_create_embeddings, search_similar, TYPE_CONVERSATION, TYPE_MESSAGE

from pydantic import BaseModel
from typing import List

from collections import OrderedDict

import logging

import time

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.metrics import mean_squared_error

from xgboost import XGBRegressor

# Configurar el logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


DB_EMBEDDINGS = "data/embeddings.db"
DB_SETTINGS = "data/settings.db"

UPLOAD_DIR = Path("data/extracted_files")
UPLOAD_EXCEL = Path("data/excel")
RESULTS_DIR = Path("data/results")
UPLOAD_PREDICT = Path("data/files_for_predict")

# Cargar las variables de entorno desde el archivo .env
load_dotenv()

# Obtener la clave de la variable de entorno
api_key = os.getenv("OPENAI_API_KEY")

# Modelo de ChatGPT que se va a usar al calcular atributos
chatGPTmodel = "gpt-4o-mini-2024-07-18"

# Initialize FastAPI app
app = FastAPI()
api_app = FastAPI(title="API")

# Variables globales
evaluacion_dict = {}
evaluacion_dict_predict = {}
hayResultados = 0

class ValoresInput(BaseModel):
    relacion: int
    conocimiento: int
    nombre: str

class EntrenamientoRequest(BaseModel):
    metodo: str
    caracteristicas: List[str]
    etiqueta: str
    porcentaje_prueba: float

class PrediccionDatos(BaseModel):
    metodo: str
    caracteristicas: List[str]
    etiqueta: str
    porcentaje_prueba: float
    valores: List[float]

class Asignatura(BaseModel):
    asignatura: str

class NombreInput(BaseModel):
    nombre: str


@app.on_event("startup")
async def startup_event():
    logger.info("Starting up and cleaning the upload directory.")
    # Limpiar la carpeta de destino al iniciar la aplicación
    if UPLOAD_DIR.exists():
        shutil.rmtree(UPLOAD_DIR)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    if UPLOAD_EXCEL.exists():
        shutil.rmtree(UPLOAD_EXCEL)
    UPLOAD_EXCEL.mkdir(parents=True, exist_ok=True)

@api_app.post("/upload-zip")
async def upload_zip(file: UploadFile = File(...)):
    global hayResultados
    hayResultados = 0

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Sólo se permiten archivos zip. Consultar 'AYUDA'")
    
    # Eliminar el contenido existente en la carpeta de destino
    if UPLOAD_DIR.exists():
        shutil.rmtree(UPLOAD_DIR)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Eliminar el contenido existente en la carpeta que contiene el excel de notas
    if UPLOAD_EXCEL.exists():
        shutil.rmtree(UPLOAD_EXCEL)
    UPLOAD_EXCEL.mkdir(parents=True, exist_ok=True)

    # Guardar el archivo zip temporalmente
    temp_zip_path = UPLOAD_DIR / file.filename

    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Extraer el archivo zip
    with zipfile.ZipFile(temp_zip_path, "r") as zip_ref:
        zip_ref.extractall(UPLOAD_DIR)

    # Eliminar el archivo zip temporal
    temp_zip_path.unlink()

    return {"detail": "Archivo cargado y extraído exitosamente"}

def extract_nested_zip(file_path, extract_to):
    # Función que extrae archivos .zip anidados en carpetas
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)

def search_conversations_json(directory, destination_folder):
    # Función que busca y extrae archivos conversations.json en directorios y archivos comprimidos anidados.
    for root, dirs, files in os.walk(directory):
        # Revisar todos los archivos en el directorio actual
        for file in files:
            file_path = os.path.join(root, file)
            
            # Si encontramos un archivo conversations.json, lo copiamos a extracted_files con el nombre de la carpeta que lo contiene
            if file == 'conversations.json':
                folder_name = os.path.basename(root)
                dest_file_path = os.path.join(destination_folder, f"{folder_name}.json")
                shutil.copy(file_path, dest_file_path)
                print(f"Archivo encontrado y copiado en: {dest_file_path}")
            
            # Si encontramos un archivo .zip, lo extraemos y seguimos buscando
            elif file.endswith('.zip'):
                nested_extract_path = os.path.join(root, file.replace('.zip', ''))
                os.makedirs(nested_extract_path, exist_ok=True)
                extract_nested_zip(file_path, nested_extract_path)
                # Llamada recursiva para buscar en el nuevo directorio extraído
                search_conversations_json(nested_extract_path, destination_folder)

@api_app.post("/upload-zip2")
async def upload_zip2(file: UploadFile = File(...)):
    global hayResultados
    hayResultados = 0

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Sólo se permiten archivos zip. Consultar 'AYUDA'")
    
    # Eliminar el contenido existente en la carpeta de destino
    if UPLOAD_DIR.exists():
        shutil.rmtree(UPLOAD_DIR)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Eliminar el contenido existente en la carpeta que contiene el excel de notas
    if UPLOAD_EXCEL.exists():
        shutil.rmtree(UPLOAD_EXCEL)
    UPLOAD_EXCEL.mkdir(parents=True, exist_ok=True)

    # Guardar el archivo zip cargado temporalmente
    temp_zip_path = UPLOAD_DIR / file.filename
    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extraer y procesar el archivo zip
    temp_extract_folder = UPLOAD_DIR / Path(file.filename).stem
    os.makedirs(temp_extract_folder, exist_ok=True)
    extract_nested_zip(temp_zip_path, temp_extract_folder)
    search_conversations_json(temp_extract_folder, UPLOAD_DIR)

    # Limpiar carpeta temporal y archivo temporal
    shutil.rmtree(temp_extract_folder)
    temp_zip_path.unlink()

    is_upload_dir_empty = not os.listdir(UPLOAD_DIR)

    return {
        "isUploadDirEmpty": is_upload_dir_empty
    }

@api_app.post("/upload-excel")
async def upload_excel(file: UploadFile = File(...)):
    # Eliminar el contenido existente en la carpeta de destino
    if UPLOAD_EXCEL.exists():
        shutil.rmtree(UPLOAD_EXCEL)
    UPLOAD_EXCEL.mkdir(parents=True, exist_ok=True)

    # Guardar el archivo zip temporalmente
    excel_path = UPLOAD_EXCEL / file.filename

    with open(excel_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Verificar que exista un archivo .xlsx en el directorio
    xlsx_files = list(UPLOAD_EXCEL.glob("*.xlsx"))
    if not xlsx_files:
        excel_path.unlink()
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .xlsx. Consultar 'AYUDA'")

    # Cargar el archivo Excel
    excel_path = xlsx_files[0]
    df = pd.read_excel(excel_path)

    # Filtrar columnas que puedan contener notas (suponiendo que estén marcadas con asteriscos)
    columnas_con_asteriscos = [col for col in df.columns if col.startswith('*') and col.endswith('*')]

    if not columnas_con_asteriscos:
        excel_path.unlink()
        raise HTTPException(status_code=400, detail="No se encontró ninguna columna con notas (marcada con asteriscos) en el archivo .xlsx. Consultar 'AYUDA'")

    # Verificar que las celdas en las columnas de notas no estén en blanco si la celda correspondiente en 'FILENAME' no está en blanco
    for col in columnas_con_asteriscos:
        notas_column = df[col]
        json_column = df['FILENAME']

        for i in range(len(df)):
            if pd.notna(json_column.iloc[i]) and pd.isna(notas_column.iloc[i]):
                excel_path.unlink()
                raise HTTPException(status_code=400, detail=f"La columna {col} tiene notas en blanco pertenecientes a un alumno. Consultar 'AYUDA'")

    # Verificar los nombres de los archivos JSON necesarios
    if 'FILENAME' not in df.columns:
        excel_path.unlink()
        raise HTTPException(status_code=400, detail="No se encontró una columna llamada 'FILENAME' en el archivo .xlsx. Consultar 'AYUDA'")

    json_column = df['FILENAME']
    json_names = json_column.dropna().tolist()

    for json_name in json_names:
        json_path = UPLOAD_DIR / (json_name + '.json')
        if not json_path.exists():
            excel_path.unlink()
            raise HTTPException(status_code=400, detail=f"El archivo JSON, perteneciente a {json_name}, no se encontró. Consultar 'AYUDA'")

    return {"detail": "Archivo cargado y extraído exitosamente"}

@api_app.get("/check-folder-empty")
def check_folder_empty():
    # Verifica si ambas carpetas están vacías
    is_upload_dir_empty = not os.listdir(UPLOAD_DIR)
    is_upload_excel_empty = not os.listdir(UPLOAD_EXCEL)

    # Retorna el estado de ambas carpetas
    return {
        "isUploadDirEmpty": is_upload_dir_empty,
        "isUploadExcelEmpty": is_upload_excel_empty
    }

# Obtener lista de archivos JSON, es decir, las conversaciones de los alumnos
@api_app.get("/json-files")
def get_json_files():
    json_files = []
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(".json"):
            json_files.append(filename)
    return {"json_files": json_files}

# Prediccion
@api_app.get("/json-files-predict")
def get_json_files_predict():
    json_files = []
    for filename in os.listdir(UPLOAD_PREDICT):
        if filename.endswith(".json"):
            json_files.append(filename)
    return {"json_files": json_files}

@api_app.get("/load-conversations")
async def load_conversations_from_file(path: str = Query(..., title="File Path")):
    global conversations  # Accede a la variable conversations global
    global JSON_Selected

    try:
        JSON_Selected = path
        path = "data/extracted_files/" + path
        print(path)
        conversations = load_conversations(path)
        return {"message": "Conversations loaded successfully"}
    except Exception as e:
        return {"error": str(e)}

# Prediccion
@api_app.get("/load-conversations-predict")
async def load_conversations_from_file_predict(path: str = Query(..., title="File Path")):
    global conversations_predict  # Accede a la variable conversations global
    global JSON_Selected_predict

    try:
        JSON_Selected_predict = path
        path = "data/files_for_predict/" + path
        print(path)
        conversations_predict = load_conversations(path)
        return {"message": "Conversations loaded successfully"}
    except Exception as e:
        return {"error": str(e)}

# All conversation items
@api_app.get("/conversations")
def get_conversations():
    # Get favorites
    conn = connect_settings_db()
    cursor = conn.cursor()
    cursor.execute("SELECT conversation_id FROM favorites WHERE is_favorite = 1")
    rows = cursor.fetchall()
    favorite_ids = [row[0] for row in rows]
    conn.close()

    conversations_data = [{
        "group": time_group(conv.created),
        "id": conv.id, 
        "title": conv.title_str,
        "created": conv.created_str,
        "total_length": human_readable_time(conv.total_length, short=True),
        "is_favorite": conv.id in favorite_ids
        } for conv in conversations]
    return JSONResponse(content=conversations_data)

# Prediccion
@api_app.get("/conversations-predict")
def get_conversations_predict():
    # Get favorites
    conn = connect_settings_db()
    cursor = conn.cursor()
    cursor.execute("SELECT conversation_id FROM favorites WHERE is_favorite = 1")
    rows = cursor.fetchall()
    favorite_ids = [row[0] for row in rows]
    conn.close()

    conversations_data = [{
        "group": time_group(conv.created),
        "id": conv.id, 
        "title": conv.title_str,
        "created": conv.created_str,
        "total_length": human_readable_time(conv.total_length, short=True),
        "is_favorite": conv.id in favorite_ids
        } for conv in conversations_predict]
    return JSONResponse(content=conversations_data)


# All messages from a specific conversation by its ID
@api_app.get("/conversations/{conv_id}/messages")
def get_messages(conv_id: str):
    conversation = next((conv for conv in conversations if conv.id == conv_id), None)
    if not conversation:
        return JSONResponse(content={"error": "Invalid conversation ID"}, status_code=404)

    messages = []
    prev_created = None  # Keep track of the previous message's creation time
    for msg in conversation.messages:
        if not msg:
            continue

        # If there's a previous message and the time difference is 1 hour or more
        if prev_created and (msg.created - prev_created).total_seconds() >= 3600:
            delta = msg.created - prev_created
            time_str = human_readable_time(delta.total_seconds())            
            messages.append({
                "text": f"{time_str} passed", 
                "role": "internal"
                })

        messages.append({
            "text": markdown(msg.text),
            "role": msg.role, 
            "created": msg.created_str
        })

        # Update the previous creation time for the next iteration
        prev_created = msg.created

    response = {
        "conversation_id": conversation.id,
        "messages": messages
    }

    return JSONResponse(content=response)

# Prediccion
@api_app.get("/conversations-predict/{conv_id}/messages")
def get_messages_predict(conv_id: str):
    conversation = next((conv for conv in conversations_predict if conv.id == conv_id), None)
    if not conversation:
        return JSONResponse(content={"error": "Invalid conversation ID"}, status_code=404)

    messages = []
    prev_created = None  # Keep track of the previous message's creation time
    for msg in conversation.messages:
        if not msg:
            continue

        # If there's a previous message and the time difference is 1 hour or more
        if prev_created and (msg.created - prev_created).total_seconds() >= 3600:
            delta = msg.created - prev_created
            time_str = human_readable_time(delta.total_seconds())            
            messages.append({
                "text": f"{time_str} passed", 
                "role": "internal"
                })

        messages.append({
            "text": markdown(msg.text),
            "role": msg.role, 
            "created": msg.created_str
        })

        # Update the previous creation time for the next iteration
        prev_created = msg.created

    response = {
        "conversation_id": conversation.id,
        "messages": messages
    }

    return JSONResponse(content=response)


@api_app.get("/activity")
def get_activity():
    activity_by_day = defaultdict(int)

    for conversation in conversations:
        for message in conversation.messages:
            day = message.created.date()
            activity_by_day[day] += 1
    
    activity_by_day = {str(k): v for k, v in sorted(dict(activity_by_day).items())}

    return JSONResponse(content=activity_by_day)


@api_app.get("/statistics")
def get_statistics():
    # Calcular el promedio de mensajes, longitud promedio y dispersion promedio
    n_mensajes = 0
    promedio_longitud_mensaje = 0
    promedio_dispersión = 0

    lengths = []

    for conversation in conversations:
        # Calculate the min, max, and average lengths
        lengths.append((conversation.total_length, conversation.id))

        longitud_mensaje = 0
        n_mensajes += len(conversation.messages)
        cont_mensajes_user = 0
        intervalos = []

        for i, mensaje in enumerate(conversation.messages):
            if(mensaje.role == 'user'):
                longitud_mensaje += len(mensaje.text)
                cont_mensajes_user += 1

                if i > 0:
                    intervalo = mensaje.create_time - conversation.messages[i-1].create_time
                    intervalos.append(intervalo)

        if(cont_mensajes_user != 0):
            promedio_longitud_mensaje += longitud_mensaje / cont_mensajes_user

        if len(intervalos) > 0:
            media_intervalos = sum(intervalos) / len(intervalos)
            desviacion_media = sum(abs(intervalo - media_intervalos) for intervalo in intervalos) / len(intervalos)
            promedio_dispersión += desviacion_media

    if(len(conversations) != 0):
        promedio = float(n_mensajes / len(conversations))
        longitud_promedio = float(promedio_longitud_mensaje / len(conversations))
        dispersion_promedio = float(promedio_dispersión / len(conversations))
    else:
        promedio = 0
        longitud_promedio = 0
        dispersion_promedio = 0

    # Sort conversations by length
    lengths.sort(reverse=True)

    if lengths:
        min_threshold_seconds = 1
        filtered_min_lengths = [l for l in lengths if l[0] >= min_threshold_seconds]
        min_length = human_readable_time(min(filtered_min_lengths)[0])
        max_length = human_readable_time(max(lengths)[0])
        avg_length = human_readable_time(statistics.mean([l[0] for l in lengths]))
    else:
        min_length = max_length = avg_length = "N/A"


    # Get the last chat message timestamp and backup age
    last_chat_timestamp = max(conv.created for conv in conversations)

    return JSONResponse(content={
        "Antigüedad del último chat": human_readable_time((datetime.now() - last_chat_timestamp).total_seconds()),
        "Último mensaje": last_chat_timestamp.strftime('%d/%m/%Y'),
        "Primer mensaje": min(conv.created for conv in conversations).strftime('%d/%m/%Y'),
        "Conversación más corta": min_length,
        "Conversación más larga": max_length,
        "Duración promedio de las conversaciones": avg_length,
        "Promedio de mensajes": round(promedio, 4),
        "Longitud promedio de los mensajes": round(longitud_promedio, 4),
        "Dispersión promedio de los mensajes": round(dispersion_promedio, 4)
    })


@api_app.get("/notes")
def get_notes():
    xlsx_files = list(UPLOAD_EXCEL.glob("*.xlsx"))
    if not xlsx_files:
        print("El archivo no existe en la ruta especificada.")
        return None

    archivo_excel = xlsx_files[0]
    
    if not os.path.exists(archivo_excel):
        print("El archivo no existe en la ruta especificada.")
        return None
    else:
        print("El archivo existe. Intentando leer...")
        df = pd.read_excel(archivo_excel)
        print("Archivo leído correctamente.")
    
    # Buscar el índice del JSON seleccionado en la columna 'FILENAME'
    json_column = df['FILENAME']
    
    try:
        aux_selected = JSON_Selected.replace('.json', '')
        selected_index = json_column.tolist().index(aux_selected)
    except ValueError:
        print(f"No se ha encontrado un alumno asociado al JSON '{JSON_Selected}' en la columna 'FILENAME'.")
        return None
    
    # Crear el diccionario de notas
    notas_dict = {}
    
    for col in df.columns:
        if col.startswith('*') and col.endswith('*'):  # Identificar las columnas entre asteriscos
            nota_teoria = df.iloc[selected_index][col]
            notas_dict[col.strip('*')] = nota_teoria  # Añadir al diccionario, removiendo asteriscos del nombre

    print('Notas encontradas:', notas_dict)
    
    return notas_dict


@api_app.get("/atributos")
def get_atributos():
    global hayResultados
    global resultados_IA

    atributos_dict = {}
    try:
        if hayResultados == 1:
            index = resultados_IA['json'].index(JSON_Selected)
            ia_value = resultados_IA['IA'][index]
            relacion, conocimiento = ia_value.split(', ')
            atributos_dict['relacion'] = int(relacion)
            atributos_dict['conocimiento'] = int(conocimiento)
        else:
            return None
    except ValueError:
        print(f"El JSON '{JSON_Selected}' no se encuentra.")
        return None
    
    return atributos_dict


@api_app.get("/valorEval")
def get_valor_evaluacion():
    global evaluacion_dict

    valores_dict = {}
    try:
        if JSON_Selected in evaluacion_dict:
            valores = evaluacion_dict[JSON_Selected]
            valores_dict['relacion'] = int(valores["relacion"])
            valores_dict['conocimiento'] = int(valores["conocimiento"])
        else:
            return None
    except ValueError:
        print(f"El JSON '{JSON_Selected}' no se encuentra.")
        return None
    
    return valores_dict


# Search conversations and messages
@api_app.get("/search")
def search_conversations(query: str = Query(..., min_length=3, description="Search query")):

    def add_search_result(search_results, result_type, conv, msg):
        search_results.append({
            "type": result_type,
            "id": conv.id,
            "title": conv.title_str,
            "text": markdown(msg.text),
            "role": msg.role,
            "created": conv.created_str if result_type == "conversation" else msg.created_str,
        })

    def find_conversation_by_id(conversations, id):
        return next((conv for conv in conversations if conv.id == id), None)

    def find_message_by_id(messages, id):
        return next((msg for msg in messages if msg.id == id), None)

    search_results = []

    for conv in conversations:
        query_lower = query.lower()
        if (conv.title or "").lower().find(query_lower) != -1:
            add_search_result(search_results, "conversation", conv, conv.messages[0])

        for msg in conv.messages:
            if msg and msg.text.lower().find(query_lower) != -1:
                add_search_result(search_results, "message", conv, msg)

        if len(search_results) >= 10:
            break

    return JSONResponse(content=search_results)

# Prediccion
@api_app.get("/search-predict")
def search_conversations_predict(query: str = Query(..., min_length=3, description="Search query")):

    def add_search_result(search_results, result_type, conv, msg):
        search_results.append({
            "type": result_type,
            "id": conv.id,
            "title": conv.title_str,
            "text": markdown(msg.text),
            "role": msg.role,
            "created": conv.created_str if result_type == "conversation" else msg.created_str,
        })

    def find_conversation_by_id(conversations_predict, id):
        return next((conv for conv in conversations_predict if conv.id == id), None)

    def find_message_by_id(messages, id):
        return next((msg for msg in messages if msg.id == id), None)

    search_results = []

    for conv in conversations_predict:
        query_lower = query.lower()
        if (conv.title or "").lower().find(query_lower) != -1:
            add_search_result(search_results, "conversation", conv, conv.messages[0])

        for msg in conv.messages:
            if msg and msg.text.lower().find(query_lower) != -1:
                add_search_result(search_results, "message", conv, msg)

        if len(search_results) >= 10:
            break

    return JSONResponse(content=search_results)


# Toggle favorite status
@api_app.post("/toggle_favorite")
def toggle_favorite(conv_id: str):
    conn = connect_settings_db()
    cursor = conn.cursor()
    
    # Check if the conversation_id already exists in favorites
    cursor.execute("SELECT is_favorite FROM favorites WHERE conversation_id = ?", (conv_id,))
    row = cursor.fetchone()
    
    if row is None:
        # Insert new entry with is_favorite set to True
        cursor.execute("INSERT INTO favorites (conversation_id, is_favorite) VALUES (?, ?)", (conv_id, True))
        is_favorite = True
    else:
        # Toggle the is_favorite status
        is_favorite = not row[0]
        cursor.execute("UPDATE favorites SET is_favorite = ? WHERE conversation_id = ?", (is_favorite, conv_id))
    
    conn.commit()
    conn.close()
    
    return {"conversation_id": conv_id, "is_favorite": is_favorite}


@api_app.get("/generar_datos")
def generar_datos():
    # Lógica para generar los datos
    global data_global
    global hayResultados
    global resultados_IA
    global evaluacion_dict

    promedio = []
    longitud_promedio = []
    dispersion_promedio = []
    notass = []
    
    xlsx_files = list(UPLOAD_EXCEL.glob("*.xlsx"))
    archivo_excel = xlsx_files[0]
    if not os.path.exists(archivo_excel):
        print("El archivo no existe en la ruta especificada.")
    else:
        print("El archivo existe. Intentando leer...")
        df = pd.read_excel(archivo_excel)
        print("Archivo leído correctamente.")
    json_column = df['FILENAME']
    
    json_names = json_column.dropna().tolist()
    print(json_names)

    json_files = []
    
    for jsonn in json_names:
        n_mensajes = 0
        promedio_longitud_mensaje = 0
        promedio_dispersión = 0
        path = UPLOAD_DIR / (jsonn + '.json')
        print(path)
        json_files.append(jsonn + '.json')
        aux_conversations = load_conversations(path)

        for conversation in aux_conversations:
            longitud_mensaje = 0
            n_mensajes += len(conversation.messages)
            cont_mensajes_user = 0
            intervalos = []

            for i, mensaje in enumerate(conversation.messages):
                if(mensaje.role == 'user'):
                    longitud_mensaje += len(mensaje.text)
                    cont_mensajes_user += 1

                    if i > 0:
                        intervalo = mensaje.create_time - conversation.messages[i-1].create_time
                        intervalos.append(intervalo)

            if(cont_mensajes_user != 0):
                promedio_longitud_mensaje += longitud_mensaje / cont_mensajes_user

            if len(intervalos) > 0:
                media_intervalos = sum(intervalos) / len(intervalos)
                desviacion_media = sum(abs(intervalo - media_intervalos) for intervalo in intervalos) / len(intervalos)
                promedio_dispersión += desviacion_media

        if(len(aux_conversations) != 0):
            promedio.append(float(n_mensajes / len(aux_conversations)))
            longitud_promedio.append(float(promedio_longitud_mensaje / len(aux_conversations)))
            dispersion_promedio.append(float(promedio_dispersión / len(aux_conversations)))
        else:
            promedio.append(0)
            longitud_promedio.append(0)
            dispersion_promedio.append(0)
          
    # Filtrar las columnas cuyo nombre esté entre asteriscos
    columnas_con_asteriscos = [col.strip('*') for col in df.columns if col.startswith('*') and col.endswith('*')]
    
    # Crear un diccionario para almacenar las notas en vectores separados, excluyendo valores en blanco
    vectores_notas = {col: df['*'+col+'*'].dropna().tolist() for col in columnas_con_asteriscos}
    
    # Calcular el coeficiente de correlación de Pearson
    correlation_coefficient_promedio_mensajes = []
    correlation_coefficient_longitud_promedio = []
    correlation_coefficient_dispersion_promedio = []
    
    global string_columnas
    string_columnas = []
    
    for columna, notas in vectores_notas.items():
        data = {"promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio": dispersion_promedio, "nota":notas}
        df = pd.DataFrame(data)

        string_columnas.append(columna)

        # Verificar que no se obtiene el valor invalido Nan
        aux = df['promedio_mensajes'].corr(df['nota'])
        if np.isnan(aux):
            correlation_coefficient_promedio_mensajes.append('null')
        else:
            correlation_coefficient_promedio_mensajes.append(aux)

        aux = df['longitud_promedio'].corr(df['nota'])
        if np.isnan(aux):
            correlation_coefficient_longitud_promedio.append('null')
        else:
            correlation_coefficient_longitud_promedio.append(aux)

        aux = df['dispersion_promedio'].corr(df['nota'])
        if np.isnan(aux):
            correlation_coefficient_dispersion_promedio.append('null')
        else:
            correlation_coefficient_dispersion_promedio.append(aux)
    

    hayEvaluacion = 0
    if len(evaluacion_dict) > 0:
        hayEvaluacion = 1
        dict_json_notas = {"filename":json_files, "nota":vectores_notas}
        eval_dict = {'json': [], 'relacion': [], 'conocimiento': []}

        evaluacion_dict_ordenado = OrderedDict(
            (nombre, evaluacion_dict[nombre]) for nombre in json_files if nombre in evaluacion_dict
        )

        evaluacion_dict = evaluacion_dict_ordenado

        # Añadir las notas a los alumnos que tienen los atributos calculados
        dict_evaluacion_con_notas = {
                'json': [],
                'relacion': [],
                'conocimiento': [],
                'nota': {col: [] for col in columnas_con_asteriscos}
        }
        for nombre_json, valores in evaluacion_dict.items():
            if nombre_json in dict_json_notas['filename']:
                # Obtener el índice del json_file en dict_json_notas
                index = dict_json_notas['filename'].index(nombre_json)

                # Agregar los valores correspondientes a dict_evaluacion_con_notas
                dict_evaluacion_con_notas['json'].append(nombre_json)
                dict_evaluacion_con_notas['relacion'].append(valores['relacion'])
                dict_evaluacion_con_notas['conocimiento'].append(valores['conocimiento'])
                for col in columnas_con_asteriscos:
                    dict_evaluacion_con_notas['nota'][col].append(dict_json_notas['nota'][col][index])

        correlation_coefficient_relacion_eval = []
        correlation_coefficient_conocimiento_eval = []

        df = pd.DataFrame({
                'json': dict_evaluacion_con_notas['json'],
                'relacion': dict_evaluacion_con_notas['relacion'],
                'conocimiento': dict_evaluacion_con_notas['conocimiento']
            })

        for columna, notas in dict_evaluacion_con_notas['nota'].items():
            df[columna] = notas    

            # Calcular los coeficientes de correlación
            # Verificar que no se obtiene el valor invalido Nan
            aux = df['relacion'].corr(df[columna])
            if np.isnan(aux):
                correlation_coefficient_relacion_eval.append('null')
            else:
                correlation_coefficient_relacion_eval.append(aux)

            aux = df['conocimiento'].corr(df[columna])
            if np.isnan(aux):
                correlation_coefficient_conocimiento_eval.append('null')
            else:
                correlation_coefficient_conocimiento_eval.append(aux)

        if hayResultados == 0:
            datos = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "cc_pm":correlation_coefficient_promedio_mensajes, "cc_lp":correlation_coefficient_longitud_promedio, "cc_dp": correlation_coefficient_dispersion_promedio, "evaluacion_results": dict_evaluacion_con_notas, "hayEvaluacion":hayEvaluacion, "hayResultados":hayResultados, 'cc_r_e': correlation_coefficient_relacion_eval, 'cc_c_e': correlation_coefficient_conocimiento_eval}
            data_global = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "evaluacion_results": dict_evaluacion_con_notas, "hayEvaluacion":hayEvaluacion, "hayResultados":hayResultados}

    if hayResultados == 1:
        dict_json_notas = {"filename":json_files, "nota":vectores_notas}
        atributos_dict = {'json': [], 'relacion': [], 'conocimiento': []}

        json_ordenado = []
        IA_ordenado = []

        for nombre in json_files:
            if nombre in resultados_IA["json"]:
                index = resultados_IA["json"].index(nombre)
                json_ordenado.append(resultados_IA["json"][index])
                IA_ordenado.append(resultados_IA["IA"][index])

        resultados_IA = {
            "json": json_ordenado,
            "IA": IA_ordenado
        }

 

        for i in range(len(resultados_IA['json'])):
            json_file = resultados_IA['json'][i]
            ia_value = resultados_IA['IA'][i]
        
            # Dividir la cadena de IA en relación y conocimiento
            relacion, conocimiento = ia_value.split(', ')
        
            # Añadir los valores al nuevo diccionario
            atributos_dict['json'].append(json_file)
            atributos_dict['relacion'].append(int(relacion))
            atributos_dict['conocimiento'].append(int(conocimiento))

        # Añadir las notas a los alumnos que tienen los atributos calculados
        dict_atributos_con_notas = {
                'json': [],
                'relacion': [],
                'conocimiento': [],
                'nota': {col: [] for col in columnas_con_asteriscos}
        }
        for i, json_file in enumerate(atributos_dict['json']):
            if json_file in dict_json_notas['filename']:
                # Obtener el índice del json_file en dict_json_notas
                index = dict_json_notas['filename'].index(json_file)

                # Agregar los valores correspondientes a dict_atributos_con_notas
                dict_atributos_con_notas['json'].append(json_file)
                dict_atributos_con_notas['relacion'].append(atributos_dict['relacion'][i])
                dict_atributos_con_notas['conocimiento'].append(atributos_dict['conocimiento'][i])
                for col in columnas_con_asteriscos:
                    dict_atributos_con_notas['nota'][col].append(dict_json_notas['nota'][col][index])

        correlation_coefficient_relacion = []
        correlation_coefficient_conocimiento = []

        df = pd.DataFrame({
                'json': dict_atributos_con_notas['json'],
                'relacion': dict_atributos_con_notas['relacion'],
                'conocimiento': dict_atributos_con_notas['conocimiento']
            })

        for columna, notas in dict_atributos_con_notas['nota'].items():
            df[columna] = notas    

            # Calcular los coeficientes de correlación
            # Verificar que no se obtiene el valor invalido Nan
            aux = df['relacion'].corr(df[columna])
            if np.isnan(aux):
                correlation_coefficient_relacion.append('null')
            else:
                correlation_coefficient_relacion.append(aux)

            aux = df['conocimiento'].corr(df[columna])
            if np.isnan(aux):
                correlation_coefficient_conocimiento.append('null')
            else:
                correlation_coefficient_conocimiento.append(aux)

        if hayEvaluacion == 0:
            datos = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "cc_pm":correlation_coefficient_promedio_mensajes, "cc_lp":correlation_coefficient_longitud_promedio, "cc_dp": correlation_coefficient_dispersion_promedio, "hayEvaluacion":hayEvaluacion, "atributos_results": dict_atributos_con_notas, "hayResultados":hayResultados, 'cc_r': correlation_coefficient_relacion, 'cc_c': correlation_coefficient_conocimiento}
            data_global = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "hayEvaluacion":hayEvaluacion, "atributos_results": dict_atributos_con_notas, "hayResultados":hayResultados}

    if hayEvaluacion == 1 and hayResultados == 1:
        datos = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "cc_pm":correlation_coefficient_promedio_mensajes, "cc_lp":correlation_coefficient_longitud_promedio, "cc_dp": correlation_coefficient_dispersion_promedio, "evaluacion_results": dict_evaluacion_con_notas, "hayEvaluacion":hayEvaluacion, 'cc_r_e': correlation_coefficient_relacion_eval, 'cc_c_e': correlation_coefficient_conocimiento_eval, "atributos_results": dict_atributos_con_notas, "hayResultados":hayResultados, 'cc_r': correlation_coefficient_relacion, 'cc_c': correlation_coefficient_conocimiento}
        data_global = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "evaluacion_results":dict_evaluacion_con_notas, "hayEvaluacion":hayEvaluacion, "atributos_results": dict_atributos_con_notas, "hayResultados":hayResultados}

    if hayEvaluacion == 0 and hayResultados == 0:
        datos = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "cc_pm":correlation_coefficient_promedio_mensajes, "cc_lp":correlation_coefficient_longitud_promedio, "cc_dp": correlation_coefficient_dispersion_promedio, "hayEvaluacion":hayEvaluacion, "hayResultados":hayResultados}
        data_global = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio, "nota":vectores_notas, "hayEvaluacion":hayEvaluacion, "hayResultados":hayResultados}
    print('\n\nDatos: ', datos)
    return JSONResponse(content=datos)


@api_app.get("/obtener_caracteristicas")
def obtener_caracteristicas():
    global hayResultados
    global evaluacion_dict

    generar_datos()

    hayEvaluacion = 0
    if len(evaluacion_dict) > 0:
        hayEvaluacion = 1

    if hayResultados == 1 and hayEvaluacion == 0:
        datos = {"caracteristicas": ['(IA) - % Relación con la asignatura', '(IA) - % Conocimiento sobre la asignatura'], "etiquetas": string_columnas, "hayEvaluacion":hayEvaluacion, "hayResultados": hayResultados}
    elif hayResultados == 0 and hayEvaluacion == 1:
        datos = {"caracteristicas": ['% Relación con la asignatura', '% Conocimiento sobre la asignatura'], "etiquetas": string_columnas, "hayEvaluacion":hayEvaluacion, "hayResultados": hayResultados}
    elif hayResultados == 1 and hayEvaluacion == 1:
        datos = {"caracteristicas": ['% Relación con la asignatura', '% Conocimiento sobre la asignatura', '(IA) - % Relación con la asignatura', '(IA) - % Conocimiento sobre la asignatura'], "etiquetas": string_columnas, "hayEvaluacion":hayEvaluacion, "hayResultados": hayResultados}
    else:
        datos = {"etiquetas": string_columnas, "hayEvaluacion":hayEvaluacion, "hayResultados": hayResultados}
     
    return JSONResponse(content=datos)


@api_app.post("/entrenar")
def entrenar(datos: EntrenamientoRequest):
    # Procesas los datos recibidos
    caract = []
    caracteristicas = datos.caracteristicas
    porcentaje_test = datos.porcentaje_prueba / 100
    accuracy = 0

    dict = {
            'filename': data_global['filename'],
            'promedio_mensajes': data_global['promedio_mensajes'],
            'longitud_promedio': data_global['longitud_promedio'],
            'dispersion_promedio': data_global['dispersion_promedio'],
            'nota': {k: v[:] for k, v in data_global['nota'].items()} 
    }
    
    print(porcentaje_test)

    relacion = []
    conocimiento = []
    relacionIA = []
    conocimientoIA = []
    if ('% Relación con la asignatura' in caracteristicas or '% Conocimiento sobre la asignatura' in caracteristicas) and ('(IA) - % Relación con la asignatura' in caracteristicas or '(IA) - % Conocimiento sobre la asignatura' in caracteristicas):
        # Listas de archivos en evaluación y atributos
        archivos_evaluacion = set(data_global['evaluacion_results']['json'])
        archivos_atributos = set(data_global['atributos_results']['json'])

        # Determinamos los archivos en común
        archivos_comunes = archivos_evaluacion.intersection(archivos_atributos)

        # Filtrar 'filename' para obtener solo archivos en común
        indices_comunes = [i for i, filename in enumerate(dict['filename']) if filename in archivos_comunes]

        # Filtramos los datos en `dict` usando solo los índices comunes
        for key in dict.keys():
            if key != 'nota':  # Para las claves que no son 'nota'
                dict[key] = [value for i, value in enumerate(dict[key]) if i in indices_comunes]
            else:  # Para la clave 'nota' que contiene sublistas
                for subkey in dict['nota']:
                    dict['nota'][subkey] = [value for i, value in enumerate(dict['nota'][subkey]) if i in indices_comunes]
        
        relacion = [data_global['evaluacion_results']['relacion'][i] for i in indices_comunes]
        conocimiento = [data_global['evaluacion_results']['conocimiento'][i] for i in indices_comunes]
        relacionIA = [data_global['atributos_results']['relacion'][i] for i in indices_comunes]
        conocimientoIA = [data_global['atributos_results']['conocimiento'][i] for i in indices_comunes]



    # Los vectores deben tener el mismo número de elementos
    elif '% Relación con la asignatura' in caracteristicas or '% Conocimiento sobre la asignatura' in caracteristicas:
        # Hay que eliminar los indices correspondientes a los alumnos que no han sido evaluados
        archivos_comunes = set(data_global['evaluacion_results']['json'])

        # Filtrar 'filename' para obtener solo archivos en común
        indices_comunes = [i for i, filename in enumerate(dict['filename']) if filename in archivos_comunes]

        for key in dict.keys():
            if key != 'nota':  # Para las claves que no son 'nota'
                dict[key] = [value for i, value in enumerate(dict[key]) if i in indices_comunes]
            else:  # Para la clave 'nota' que contiene sublistas
                for subkey in dict['nota']:
                    dict['nota'][subkey] = [value for i, value in enumerate(dict['nota'][subkey]) if i in indices_comunes]
    
        relacion = data_global['evaluacion_results']['relacion']
        conocimiento = data_global['evaluacion_results']['conocimiento']

    elif '(IA) - % Relación con la asignatura' in caracteristicas or '(IA) - % Conocimiento sobre la asignatura' in caracteristicas:
        # Hay que eliminar los indices correspondientes a los alumnos que no tienen atributos calculados por superar el limite de tokens
        archivos_comunes = set(data_global['atributos_results']['json'])

        # Filtrar 'filename' para obtener solo archivos en común
        indices_comunes = [i for i, filename in enumerate(dict['filename']) if filename in archivos_comunes]

        for key in dict.keys():
            if key != 'nota':  # Para las claves que no son 'nota'
                dict[key] = [value for i, value in enumerate(dict[key]) if i in indices_comunes]
            else:  # Para la clave 'nota' que contiene sublistas
                for subkey in dict['nota']:
                    dict['nota'][subkey] = [value for i, value in enumerate(dict['nota'][subkey]) if i in indices_comunes]
    
        relacionIA = data_global['atributos_results']['relacion']
        conocimientoIA = data_global['atributos_results']['conocimiento']

    if 'Promedio de mensajes' in caracteristicas:
        caract.append(dict['promedio_mensajes'])
    if 'Longitud promedio de mensajes' in caracteristicas:
        caract.append(dict['longitud_promedio']) 
    if 'Dispersión de los mensajes' in caracteristicas:
        caract.append(dict['dispersion_promedio'])
    if '% Relación con la asignatura' in caracteristicas:
        caract.append(relacion)
    if '% Conocimiento sobre la asignatura' in caracteristicas:
        caract.append(conocimiento)
    if '(IA) - % Relación con la asignatura' in caracteristicas:
        caract.append(relacionIA)
    if '(IA) - % Conocimiento sobre la asignatura' in caracteristicas:
        caract.append(conocimientoIA)
        
    #for columna in dict['nota']:
        #if columna in caracteristicas:
            #caract.append(dict['nota'][columna])
        
    if datos.etiqueta in dict['nota']:
        labels = dict['nota'][datos.etiqueta]
    
    X = np.array(caract).T
    y = np.array(labels)
            
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=porcentaje_test, random_state=42)
    
    if datos.metodo == 'Algoritmo KNN':
        # Entrenar un KNN (regresión)
        knn = KNeighborsRegressor()
        knn.fit(X_train, y_train)
        knn_pred = knn.predict(X_test)
        knn_mse = mean_squared_error(y_test, knn_pred)
        knn_accuracy = np.sqrt(knn_mse)  # Usar RMSE como métrica (Raíz del Error Cuadrático Medio)
        accuracy = knn_accuracy
        print("RMSE del KNN:", knn_accuracy)
    

    if datos.metodo == 'Algoritmo Árbol de decisión':
        # Entrenar un árbol de decisión (regresión)
        tree = DecisionTreeRegressor(random_state=42)
        tree.fit(X_train, y_train)
        tree_pred = tree.predict(X_test)
        tree_mse = mean_squared_error(y_test, tree_pred)
        tree_accuracy = np.sqrt(tree_mse)  # Usar RMSE como métrica (Raíz del Error Cuadrático Medio)
        accuracy = tree_accuracy
        print("RMSE del árbol de decisión:", tree_accuracy)


    if datos.metodo == 'Algoritmo XGBoost':
        # Entrenar un XGBoost (regresión)
        xgboost = XGBRegressor(random_state=42)
        xgboost.fit(X_train, y_train)
        xgboost_pred = xgboost.predict(X_test)
        xgboost_mse = mean_squared_error(y_test, xgboost_pred)
        xgboost_accuracy = np.sqrt(xgboost_mse)  # Usar RMSE como métrica (Raíz del Error Cuadrático Medio)
        accuracy = xgboost_accuracy
        print("RMSE del XGBoost:", xgboost_accuracy)


    if datos.metodo == 'Red neuronal MLP':
        # Entrenar una red neuronal MLP (regresión)     hidden_layer_sizes=(100, 100): Define dos capas ocultas con 100 neuronas cada una.
        mlp = MLPRegressor(hidden_layer_sizes=(100, 100), max_iter=1000, random_state=42)
        mlp.fit(X_train, y_train)
        mlp_pred = mlp.predict(X_test)
        mlp_mse = mean_squared_error(y_test, mlp_pred)
        mlp_accuracy = np.sqrt(mlp_mse)  # Usar RMSE como métrica
        accuracy = mlp_accuracy
        print("RMSE de la red neuronal MLP:", mlp_accuracy)
    
            
    return {
        "mensaje": "Datos recibidos correctamente",
        "metodo": datos.metodo,
        "caracteristicas": datos.caracteristicas,
        "etiqueta": datos.etiqueta,
        "porcentaje_prueba": datos.porcentaje_prueba,
        "accuracy": accuracy
    }


@api_app.post("/upload-zip-prediction")
async def upload_zip_prediction(file: UploadFile = File(...)):

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Sólo se permiten archivos zip. Consultar 'AYUDA'")
    
    # Eliminar el contenido existente en la carpeta de destino
    if UPLOAD_PREDICT.exists():
        shutil.rmtree(UPLOAD_PREDICT)
    UPLOAD_PREDICT.mkdir(parents=True, exist_ok=True)

    # Guardar el archivo zip cargado temporalmente
    temp_zip_path = UPLOAD_PREDICT / file.filename
    with open(temp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extraer y procesar el archivo zip
    temp_extract_folder = UPLOAD_PREDICT / Path(file.filename).stem
    os.makedirs(temp_extract_folder, exist_ok=True)
    extract_nested_zip(temp_zip_path, temp_extract_folder)
    search_conversations_json(temp_extract_folder, UPLOAD_PREDICT)

    # Limpiar carpeta temporal y archivo temporal
    shutil.rmtree(temp_extract_folder)
    temp_zip_path.unlink()

    is_upload_dir_empty = not os.listdir(UPLOAD_PREDICT)

    return {
        "isUploadDirEmpty": is_upload_dir_empty
    }


@api_app.get("/obtener-datos-chats")
def obtener_datos_chats():
    # Lógica para generar los datos

    promedio = []
    longitud_promedio = []
    dispersion_promedio = []

    json_files = []
    for filename in os.listdir(UPLOAD_PREDICT):
        if filename.endswith(".json"):
            json_files.append(filename)
    
    for jsonn in json_files:
        n_mensajes = 0
        promedio_longitud_mensaje = 0
        promedio_dispersión = 0
        path = UPLOAD_PREDICT / jsonn
        aux_conversations = load_conversations(path)

        for conversation in aux_conversations:
            longitud_mensaje = 0
            n_mensajes += len(conversation.messages)
            cont_mensajes_user = 0
            intervalos = []

            for i, mensaje in enumerate(conversation.messages):
                if(mensaje.role == 'user'):
                    longitud_mensaje += len(mensaje.text)
                    cont_mensajes_user += 1

                    if i > 0:
                        intervalo = mensaje.create_time - conversation.messages[i-1].create_time
                        intervalos.append(intervalo)

            if(cont_mensajes_user != 0):
                promedio_longitud_mensaje += longitud_mensaje / cont_mensajes_user

            if len(intervalos) > 0:
                media_intervalos = sum(intervalos) / len(intervalos)
                desviacion_media = sum(abs(intervalo - media_intervalos) for intervalo in intervalos) / len(intervalos)
                promedio_dispersión += desviacion_media

        if(len(aux_conversations) != 0):
            promedio.append(float(n_mensajes / len(aux_conversations)))
            longitud_promedio.append(float(promedio_longitud_mensaje / len(aux_conversations)))
            dispersion_promedio.append(float(promedio_dispersión / len(aux_conversations)))
        else:
            promedio.append(0)
            longitud_promedio.append(0)
            dispersion_promedio.append(0)
 
    datos = {"filename":json_files, "promedio_mensajes":promedio, "longitud_promedio":longitud_promedio, "dispersion_promedio":dispersion_promedio}
    
    
    return JSONResponse(content=datos)


@api_app.post("/predecir")
def predecir(datos: PrediccionDatos):
    # Procesas los datos recibidos
    caract = []
    caracteristicas = datos.caracteristicas
    porcentaje_test = datos.porcentaje_prueba / 100
    accuracy = 0
    valores = np.array(datos.valores)
    valores_2d = valores.reshape(1, -1)
    
    print(porcentaje_test)
    print(valores_2d)
    
    dict = {
            'filename': data_global['filename'],
            'promedio_mensajes': data_global['promedio_mensajes'],
            'longitud_promedio': data_global['longitud_promedio'],
            'dispersion_promedio': data_global['dispersion_promedio'],
            'nota': {k: v[:] for k, v in data_global['nota'].items()} 
    }
    
    relacion = []
    conocimiento = []
    relacionIA = []
    conocimientoIA = []
    if ('% Relación con la asignatura' in caracteristicas or '% Conocimiento sobre la asignatura' in caracteristicas) and ('(IA) - % Relación con la asignatura' in caracteristicas or '(IA) - % Conocimiento sobre la asignatura' in caracteristicas):
        # Listas de archivos en evaluación y atributos
        archivos_evaluacion = set(data_global['evaluacion_results']['json'])
        archivos_atributos = set(data_global['atributos_results']['json'])

        # Determinamos los archivos en común
        archivos_comunes = archivos_evaluacion.intersection(archivos_atributos)

        # Filtrar 'filename' para obtener solo archivos en común
        indices_comunes = [i for i, filename in enumerate(dict['filename']) if filename in archivos_comunes]

        # Filtramos los datos en `dict` usando solo los índices comunes
        for key in dict.keys():
            if key != 'nota':  # Para las claves que no son 'nota'
                dict[key] = [value for i, value in enumerate(dict[key]) if i in indices_comunes]
            else:  # Para la clave 'nota' que contiene sublistas
                for subkey in dict['nota']:
                    dict['nota'][subkey] = [value for i, value in enumerate(dict['nota'][subkey]) if i in indices_comunes]
        
        relacion = [data_global['evaluacion_results']['relacion'][i] for i in indices_comunes]
        conocimiento = [data_global['evaluacion_results']['conocimiento'][i] for i in indices_comunes]
        relacionIA = [data_global['atributos_results']['relacion'][i] for i in indices_comunes]
        conocimientoIA = [data_global['atributos_results']['conocimiento'][i] for i in indices_comunes]



    # Los vectores deben tener el mismo número de elementos
    elif '% Relación con la asignatura' in caracteristicas or '% Conocimiento sobre la asignatura' in caracteristicas:
        # Hay que eliminar los indices correspondientes a los alumnos que no han sido evaluados
        archivos_comunes = set(data_global['evaluacion_results']['json'])

        # Filtrar 'filename' para obtener solo archivos en común
        indices_comunes = [i for i, filename in enumerate(dict['filename']) if filename in archivos_comunes]

        for key in dict.keys():
            if key != 'nota':  # Para las claves que no son 'nota'
                dict[key] = [value for i, value in enumerate(dict[key]) if i in indices_comunes]
            else:  # Para la clave 'nota' que contiene sublistas
                for subkey in dict['nota']:
                    dict['nota'][subkey] = [value for i, value in enumerate(dict['nota'][subkey]) if i in indices_comunes]
    
        relacion = data_global['evaluacion_results']['relacion']
        conocimiento = data_global['evaluacion_results']['conocimiento']

    elif '(IA) - % Relación con la asignatura' in caracteristicas or '(IA) - % Conocimiento sobre la asignatura' in caracteristicas:
        # Hay que eliminar los indices correspondientes a los alumnos que no tienen atributos calculados por superar el limite de tokens
        archivos_comunes = set(data_global['atributos_results']['json'])

        # Filtrar 'filename' para obtener solo archivos en común
        indices_comunes = [i for i, filename in enumerate(dict['filename']) if filename in archivos_comunes]

        for key in dict.keys():
            if key != 'nota':  # Para las claves que no son 'nota'
                dict[key] = [value for i, value in enumerate(dict[key]) if i in indices_comunes]
            else:  # Para la clave 'nota' que contiene sublistas
                for subkey in dict['nota']:
                    dict['nota'][subkey] = [value for i, value in enumerate(dict['nota'][subkey]) if i in indices_comunes]
    
        relacionIA = data_global['atributos_results']['relacion']
        conocimientoIA = data_global['atributos_results']['conocimiento']

    if 'Promedio de mensajes' in caracteristicas:
        caract.append(dict['promedio_mensajes'])
    if 'Longitud promedio de mensajes' in caracteristicas:
        caract.append(dict['longitud_promedio']) 
    if 'Dispersión de los mensajes' in caracteristicas:
        caract.append(dict['dispersion_promedio'])
    if '% Relación con la asignatura' in caracteristicas:
        caract.append(relacion)
    if '% Conocimiento sobre la asignatura' in caracteristicas:
        caract.append(conocimiento)
    if '(IA) - % Relación con la asignatura' in caracteristicas:
        caract.append(relacionIA)
    if '(IA) - % Conocimiento sobre la asignatura' in caracteristicas:
        caract.append(conocimientoIA)
        
    #for columna in dict['nota']:
        #if columna in caracteristicas:
            #caract.append(dict['nota'][columna])
        
    if datos.etiqueta in dict['nota']:
        labels = dict['nota'][datos.etiqueta]
    
    X = np.array(caract).T
    y = np.array(labels)
            
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=porcentaje_test, random_state=42)
    
    if datos.metodo == 'Algoritmo KNN':
        # Entrenar un KNN (regresión)
        knn = KNeighborsRegressor()
        knn.fit(X_train, y_train)
        knn_pred = knn.predict(X_test)
        knn_mse = mean_squared_error(y_test, knn_pred)
        knn_accuracy = np.sqrt(knn_mse)  # Usar RMSE como métrica (Raíz del Error Cuadrático Medio)
        accuracy = knn_accuracy
        modelo_entrenado = knn
        print("RMSE del KNN:", knn_accuracy)

 
    if datos.metodo == 'Algoritmo Árbol de decisión':
        # Entrenar un árbol de decisión (regresión)
        tree = DecisionTreeRegressor(random_state=42)
        tree.fit(X_train, y_train)
        tree_pred = tree.predict(X_test)
        tree_mse = mean_squared_error(y_test, tree_pred)
        tree_accuracy = np.sqrt(tree_mse)  # Usar RMSE como métrica (Raíz del Error Cuadrático Medio)
        accuracy = tree_accuracy
        modelo_entrenado = tree
        print("RMSE del árbol de decisión:", tree_accuracy)


    if datos.metodo == 'Algoritmo XGBoost':
        # Entrenar un XGBoost (regresión)
        xgboost = XGBRegressor(random_state=42)
        xgboost.fit(X_train, y_train)
        xgboost_pred = xgboost.predict(X_test)
        xgboost_mse = mean_squared_error(y_test, xgboost_pred)
        xgboost_accuracy = np.sqrt(xgboost_mse)  # Usar RMSE como métrica (Raíz del Error Cuadrático Medio)
        accuracy = xgboost_accuracy
        modelo_entrenado = xgboost
        print("RMSE del XGBoost:", xgboost_accuracy)


    if datos.metodo == 'Red neuronal MLP':
        # Entrenar una red neuronal MLP (regresión)
        mlp = MLPRegressor(hidden_layer_sizes=(100, 100), max_iter=1000, random_state=42)
        mlp.fit(X_train, y_train)
        mlp_pred = mlp.predict(X_test)
        mlp_mse = mean_squared_error(y_test, mlp_pred)
        mlp_accuracy = np.sqrt(mlp_mse)  # Usar RMSE como métrica
        accuracy = mlp_accuracy
        modelo_entrenado = mlp
        print("RMSE de la red neuronal MLP:", mlp_accuracy)



    if 'modelo_entrenado' in locals():
        prediccion = modelo_entrenado.predict(valores_2d)
        print("Prediccion:", prediccion)
        prediccion = prediccion.tolist()
    else:
        print("No hay un modelo entrenado disponible para hacer predicciones.")
    
            
    return {
        "mensaje": "Datos recibidos correctamente",
        "prediccion": prediccion,
        "caracteristicas": datos.caracteristicas,
        "valores": datos.valores 
    }


@api_app.post("/uploadEvaluacion")
async def upload_file_evaluacion(file: UploadFile = File(...)):
    global evaluacion_dict

    dictEv = {}

    if file.content_type == 'text/plain':
        contents = await file.read()
        # Convertir el contenido del archivo a un string
        content_str = contents.decode('utf-8')
        
        # Procesar el contenido del archivo y guardar en el diccionario
        for line in content_str.splitlines():
            if ':' in line:
                # Separar el nombre del archivo JSON y el diccionario de valores
                json_filename, valores_str = line.split(':', 1)
                json_filename = json_filename.strip()
                
                # Convertir la cadena de valores a un diccionario
                try:
                    valores = eval(valores_str.strip())
                    # Verificar que contenga las claves esperadas
                    if 'relacion' in valores and 'conocimiento' in valores:
                        dictEv[json_filename] = {
                            "relacion": valores["relacion"],
                            "conocimiento": valores["conocimiento"]
                        }
                    else:
                        raise ValueError("Faltan claves 'relacion' o 'conocimiento' en el archivo.")
                except (SyntaxError, ValueError) as e:
                    return JSONResponse(content={"status": "error", "message": f"Error procesando el archivo: {e}"}, status_code=400)

        # Verificar que los archivos JSON existen en el directorio especificado
        json_files_in_dir = set([filename for filename in os.listdir(UPLOAD_DIR) if filename.endswith(".json")])
        missing_files = [json for json in dictEv.keys() if json not in json_files_in_dir]
        
        if missing_files:
            return JSONResponse(content={"status": "error", "message": f"Archivos JSON faltantes: {', '.join(missing_files)}"}, status_code=400)

        evaluacion_dict = dictEv
        print("Diccionario de evaluaciones:", evaluacion_dict)

        # Devolver una respuesta de éxito
        return JSONResponse(content={"status": "success", "data": evaluacion_dict})
    else:
        return JSONResponse(content={"status": "error", "message": "Tipo de archivo no válido"}, status_code=400)


@api_app.get("/obtenerEvaluacion")
def obtener_resultados():
    global evaluacion_dict
    if len(evaluacion_dict) == 0:
        raise HTTPException(status_code=400, detail="No hay alumnos evaluados")

    return JSONResponse(content=evaluacion_dict)


@api_app.get("/obtener_evaluacion_predict")
async def obtener_evaluacion_predict():
    global evaluacion_dict_predict
    if len(evaluacion_dict_predict) == 0:
        raise HTTPException(status_code=400, detail="No hay alumnos evaluados")

    dictEV = {}
    json_files = []
    relacion = []
    conocimiento = []
    for filename in os.listdir(UPLOAD_PREDICT):
        if filename.endswith(".json"):
            json_files.append(filename)
    
    for jsonn in json_files:
        relacion.append(evaluacion_dict_predict[jsonn]['relacion'])
        conocimiento.append(evaluacion_dict_predict[jsonn]['conocimiento'])

    dictEV = {
        "relacion": relacion,
        "conocimiento": conocimiento
    }

    return JSONResponse(content=dictEV)


@api_app.post("/reset-evaluacion")
async def reset_evaluacion():
    global evaluacion_dict
    evaluacion_dict.clear()  # Elimina todas las evaluaciones
    # Contar archivos con extensión .json en UPLOAD_DIR
    num_archivos_json = len([archivo for archivo in os.listdir(UPLOAD_DIR) if archivo.endswith(".json")])
    return {"mensaje": "Evaluaciones eliminadas", "totalAlumnos": num_archivos_json}


@api_app.get("/estado-evaluacion")
async def estado_evaluacion():
    global evaluacion_dict
    alumnos_evaluados = len(evaluacion_dict)
    num_archivos_json = len([archivo for archivo in os.listdir(UPLOAD_DIR) if archivo.endswith(".json")])
    return {"alumnosEvaluados": alumnos_evaluados, "totalAlumnos": num_archivos_json}


@api_app.get("/estado-evaluacion-predict")
async def estado_evaluacion_predict():
    global evaluacion_dict_predict
    alumnos_evaluados = len(evaluacion_dict_predict)
    print(evaluacion_dict_predict)
    num_archivos_json = len([archivo for archivo in os.listdir(UPLOAD_PREDICT) if archivo.endswith(".json")])
    return {"alumnosEvaluados": alumnos_evaluados, "totalAlumnos": num_archivos_json}


@api_app.get("/obtener_valor_evaluacion/{nombre}")
async def obtener_valor_evaluacion(nombre: str):
    global evaluacion_dict
    if nombre in evaluacion_dict:
        valores = evaluacion_dict[nombre]
        return {"relacion": valores["relacion"], "conocimiento": valores["conocimiento"]}
    else:
        return {"mensaje": "No se encontraron valores guardados para este usuario", "relacion": None, "conocimiento": None}

# Prediccion
@api_app.get("/obtener_valor_evaluacion_predict/{nombre}")
async def obtener_valor_evaluacion_predict(nombre: str):
    global evaluacion_dict_predict
    if nombre in evaluacion_dict_predict:
        valores = evaluacion_dict_predict[nombre]
        return {"relacion": valores["relacion"], "conocimiento": valores["conocimiento"]}
    else:
        return {"mensaje": "No se encontraron valores guardados para este usuario", "relacion": None, "conocimiento": None}


@api_app.get("/json-files-status")
async def json_files_status():
    global evaluacion_dict
    # Devuelve un diccionario con el estado de guardado de cada archivo
    status_dict = {name: name in evaluacion_dict for name in evaluacion_dict.keys()}
    return {"status": status_dict}

# Prediccion
@api_app.get("/json-files-status-predict")
async def json_files_status_predict():
    global evaluacion_dict_predict
    # Devuelve un diccionario con el estado de guardado de cada archivo
    status_dict = {name: name in evaluacion_dict_predict for name in evaluacion_dict_predict.keys()}
    return {"status": status_dict}


@api_app.post("/guardar_valor_evaluacion")
async def guardar_valor_evaluacion(valores: ValoresInput):
    global evaluacion_dict
    # Validación de valores
    if valores.relacion < 0 or valores.conocimiento < 0:
        raise HTTPException(status_code=400, detail="Valores no válidos")

    # Actualizar o agregar el nombre al diccionario
    if valores.nombre in evaluacion_dict:
        # Actualizar valores existentes
        evaluacion_dict[valores.nombre]['relacion'] = valores.relacion
        evaluacion_dict[valores.nombre]['conocimiento'] = valores.conocimiento
    else:
        # Agregar nuevos valores
        evaluacion_dict[valores.nombre] = {
            "relacion": valores.relacion,
            "conocimiento": valores.conocimiento
        }

    print(f"Valores guardados: {evaluacion_dict}")
    return {"mensaje": "Valores recibidos correctamente", "valores": valores}

# Prediccion
@api_app.post("/guardar_valor_evaluacion_predict")
async def guardar_valor_evaluacion_predict(valores: ValoresInput):
    global evaluacion_dict_predict
    # Validación de valores
    if valores.relacion < 0 or valores.conocimiento < 0:
        raise HTTPException(status_code=400, detail="Valores no válidos")

    # Actualizar o agregar el nombre al diccionario
    if valores.nombre in evaluacion_dict_predict:
        # Actualizar valores existentes
        evaluacion_dict_predict[valores.nombre]['relacion'] = valores.relacion
        evaluacion_dict_predict[valores.nombre]['conocimiento'] = valores.conocimiento
    else:
        # Agregar nuevos valores
        evaluacion_dict_predict[valores.nombre] = {
            "relacion": valores.relacion,
            "conocimiento": valores.conocimiento
        }

    print(f"Valores guardados: {evaluacion_dict_predict}")
    return {"mensaje": "Valores recibidos correctamente", "valores": valores}


@api_app.delete("/eliminar_valor_evaluacion")
async def eliminar_valor_evaluacion(nombre_input: NombreInput):
    global evaluacion_dict
    nombre = nombre_input.nombre

    # Verificar si el nombre existe en el diccionario
    if nombre in evaluacion_dict:
        # Eliminar el nombre del diccionario
        del evaluacion_dict[nombre]
        return {"mensaje": f"Valores de '{nombre}' eliminados exitosamente"}
    else:
        # Lanzar un error si el nombre no existe en el diccionario
        raise HTTPException(status_code=404, detail=f"No se encontraron valores para '{nombre}'")

# Prediccion
@api_app.delete("/eliminar_valor_evaluacion_predict")
async def eliminar_valor_evaluacion_predict(nombre_input: NombreInput):
    global evaluacion_dict_predict
    nombre = nombre_input.nombre

    # Verificar si el nombre existe en el diccionario
    if nombre in evaluacion_dict_predict:
        # Eliminar el nombre del diccionario
        del evaluacion_dict_predict[nombre]
        return {"mensaje": f"Valores de '{nombre}' eliminados exitosamente"}
    else:
        # Lanzar un error si el nombre no existe en el diccionario
        raise HTTPException(status_code=404, detail=f"No se encontraron valores para '{nombre}'")



# Función para contar tokens, le damos el modelo gpt-3.5-turbo que es compatible en términos de conteo de tokens, aunque el modelo en sí sea diferente
def count_tokens(text, model="gpt-3.5-turbo"):
    encoding = tiktoken.encoding_for_model(model)
    tokens = encoding.encode(text)
    return len(tokens)


@api_app.post("/analisisIA")
def analisisIA(asignatura: Asignatura):
    global resultados_IA
    global hayResultados
    global subject

    asignatura_name = asignatura.asignatura
    subject = asignatura_name

    prompt = (
        "Analiza la conversación anterior de un alumno con Chat GPT y responde solo con "
        "dos números separados por una coma. El primer número debe indicar el porcentaje de "
        "la conversación que está relacionada con temas de la asignatura: " + asignatura_name +
        ". El segundo número debe indicar el nivel de dificultad o conocimiento mostrado en la "
        "conversación sobre la asignatura: " + asignatura_name + ", en una escala del 1 al 100. "
        "No des explicaciones adicionales. Asegurate que el formato sea 'x, y', siendo x e y números"
    )

    json_names = []
    for filename in os.listdir(UPLOAD_DIR):
        if filename.endswith(".json"):
            json_names.append(filename)

    print(json_names)

    client = OpenAI(api_key=api_key)
    json_files = []
    results_IA = []

    for jsonn in json_names:
        path = UPLOAD_DIR / jsonn
        aux_conversations = load_conversations(path)
        json_load = jsonn

        messages = []
        for conversation in aux_conversations:
            for msg in conversation.messages:
                if not msg:
                    continue

                messages.append({
                    "role": msg.role,
                    "text": msg.text
                })

        messages_str = json.dumps(messages, indent=4)
        messages_decode = messages_str.encode().decode('unicode_escape')

        # Unir todos los mensajes para calcular los tokens
        combined_messages = "Eres un asistente que recuerda el contexto." + messages_decode + prompt

        # Contar tokens
        input_tokens = count_tokens(combined_messages)

        if input_tokens > 60000:
            print(f"El número de tokens de entrada de {json_load} excede el límite de 60.000.")
        else:
            json_files.append(json_load)
            response = client.chat.completions.create(
                model=chatGPTmodel,
                messages=[
                    {"role": "system", "content": "Eres un asistente que recuerda el contexto."},
                    {"role": "user", "content": messages_decode},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=20
            )
            respuesta = response.choices[0].message.content
            results_IA.append(respuesta)
            print(respuesta)
            time.sleep(25)

    resultados_IA = {
        "json": json_files,
        "IA": results_IA
    }

    print(resultados_IA)

    if not resultados_IA:
        hayResultados = 0
    else:
        hayResultados = 1
                    
    return {"mensaje": f"El análisis para la asignatura '{asignatura}' se ha completado exitosamente."}


@api_app.get("/obtenerResultados")
def obtener_resultados():
    global hayResultados
    if hayResultados==0:
        raise HTTPException(status_code=400, detail="No existen atributos calculados")

    resultados_dict = {**resultados_IA, "asignatura": subject}

    return JSONResponse(content=resultados_dict)


@api_app.post("/uploadResults")
async def upload_file(file: UploadFile = File(...)):
    global resultados_IA
    global hayResultados
    global subject

    if file.content_type == 'text/plain':
        contents = await file.read()
        # Convertir el contenido del archivo a un string
        content_str = contents.decode('utf-8')
        
        # Procesar el contenido del archivo
        data_dict = {}
        current_key = None
        
        for line in content_str.splitlines():
            if ':' in line:
                key, value = line.split(':', 1)
                current_key = key.strip()
                data_dict[current_key] = eval(value.strip())  # Convertir la lista de string a lista de Python
            elif current_key:
                data_dict[current_key] += eval(line.strip())
        
        json_names = []
        for filename in os.listdir(UPLOAD_DIR):
            if filename.endswith(".json"):
                json_names.append(filename)

        for jsonn in data_dict['json']:
            if jsonn not in json_names:
                hayResultados = 0
                print("El archivo seleccionado no pertenece a las conversaciones cargadas.")
                return JSONResponse(content={"status": "error", "message": "El archivo seleccionado no pertenece a las conversaciones cargadas."}, status_code=400)
            

        resultados_IA = {key: data_dict[key] for key in ['json', 'IA']}
        subject = data_dict['asignatura'][0]
        hayResultados = 1

        print(resultados_IA)
        print(subject)
        
        return JSONResponse(content={"status": "success", "data": data_dict})
    else:
        return JSONResponse(content={"status": "error", "message": "Tipo de archivo no válido"}, status_code=400)


@api_app.get("/obtener_valores_ia")
def obtener_valores_ia():
    global subject

    asignatura_name = subject

    prompt = (
        "Analiza la conversación anterior de un alumno con Chat GPT y responde solo con "
        "dos números separados por una coma. El primer número debe indicar el porcentaje de "
        "la conversación que está relacionada con temas de la asignatura: " + asignatura_name +
        ". El segundo número debe indicar el nivel de dificultad o conocimiento mostrado en la "
        "conversación sobre la asignatura: " + asignatura_name + ", en una escala del 1 al 100. "
        "No des explicaciones adicionales. Asegurate que el formato sea 'x, y', siendo x e y números"
    )

    json_names = []
    for filename in os.listdir(UPLOAD_PREDICT):
        if filename.endswith(".json"):
            json_names.append(filename)

    client = OpenAI(api_key=api_key)

    json_files = []
    results_IA = []

    for jsonn in json_names:
        path = UPLOAD_PREDICT / jsonn
        aux_conversations = load_conversations(path)
        json_load = jsonn

        messages = []
        for conversation in aux_conversations:
            for msg in conversation.messages:
                if not msg:
                    continue

                messages.append({
                    "role": msg.role,
                    "text": msg.text
                })

        messages_str = json.dumps(messages, indent=4)
        messages_decode = messages_str.encode().decode('unicode_escape')

        # Unir todos los mensajes para calcular los tokens
        combined_messages = "Eres un asistente que recuerda el contexto." + messages_decode + prompt

        # Contar tokens
        input_tokens = count_tokens(combined_messages)

        if input_tokens > 60000:
            error_message = f"El número de tokens de entrada de {json_load} excede el límite de 60,000."
            print(error_message)
            return JSONResponse(content={"error": error_message}, status_code=400)
        else:
            json_files.append(json_load)
            response = client.chat.completions.create(
                model=chatGPTmodel,
                messages=[
                    {"role": "system", "content": "Eres un asistente que recuerda el contexto."},
                    {"role": "user", "content": messages_decode},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=20
            )
            respuesta = response.choices[0].message.content
            results_IA.append(respuesta)
            print(respuesta)
            time.sleep(25)

    atributos_dict = {
        "json": json_files,
        "relacion": [],
        "conocimiento": []
    }

    for ia_value in results_IA:
        try:
            # Dividir el valor en relación y conocimiento
            relacion, conocimiento = ia_value.split(', ')
        
            # Agregar los valores a sus respectivas listas en atributos_dict
            atributos_dict["relacion"].append(int(relacion))
            atributos_dict["conocimiento"].append(int(conocimiento))
        except ValueError:
            print(f"Error al procesar el valor: '{ia_value}'. Formato no válido.")
            return None

    print(atributos_dict)

                    
    return JSONResponse(content=atributos_dict)



def connect_settings_db():
    conn = sqlite3.connect(DB_SETTINGS)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            conversation_id TEXT PRIMARY KEY,
            is_favorite BOOLEAN
        );
    """)
    conn.commit()
    return conn


app.mount("/api", api_app)
app.mount("/", StaticFiles(directory="static", html=True), name="Static")
