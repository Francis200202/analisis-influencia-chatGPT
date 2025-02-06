import json
import sys
from typing import List, Union, Optional
from collections import OrderedDict
from datetime import datetime
from pydantic.v1 import BaseModel # v2 throws warnings
import tiktoken
import os

# Define el modelo por defecto que se utilizará para el cálculo de tokens
DEFAULT_MODEL_SLUG = "gpt-3.5-turbo"

# Define la clase 'Author' que representa el rol del autor de un mensaje
class Author(BaseModel):
    role: str

# Define la clase 'Content' que representa el contenido de un mensaje
class Content(BaseModel):
    content_type: str
    parts: Optional[List[Union[str, OrderedDict[str, Union[str, float, bool]]]]]
    text: Optional[str]

# Define la clase 'MessageMetadata' que contiene metadatos sobre el mensaje, como el modelo utilizado
class MessageMetadata(BaseModel):
    model_slug: Optional[str]
#     parent_id: Optional[str]

# Define la clase 'Message' que representa un mensaje en una conversación
class Message(BaseModel):
    id: str
    author: Author
    create_time: Optional[float]
    update_time: Optional[float]
    content: Optional[Content]
    metadata: MessageMetadata

    # Propiedad que devuelve el texto del mensaje
    @property
    def text(self) -> str:
        if self.content:
            if self.content.text:
                return self.content.text
            elif self.content.parts:
                return " ".join(str(part) for part in self.content.parts)
        return ""
    
    # Propiedad que devuelve el rol del autor del mensaje
    @property
    def role(self) -> str:
        return self.author.role

    # Propiedad que devuelve la fecha y hora de creación del mensaje como un objeto 'datetime'
    @property
    def created(self) -> datetime:
        return datetime.fromtimestamp(self.create_time)

    # Propiedad que devuelve la fecha y hora de creación del mensaje como una cadena formateada
    @property
    def created_str(self) -> str:
        return self.created.strftime('%d/%m/%Y %H:%M:%S')
    
    # Propiedad que devuelve el modelo utilizado para el mensaje como una cadena
    @property
    def model_str(self) -> str:
        return self.metadata.model_slug or DEFAULT_MODEL_SLUG
    
    # Método que calcula el número de tokens en el texto del mensaje
    def count_tokens(self) -> int:
        try:
            encoding = tiktoken.encoding_for_model(self.model_str)
        except KeyError:
            encoding = tiktoken.encoding_for_model(DEFAULT_MODEL_SLUG)
        return len(encoding.encode(self.text))


# Define la clase 'MessageMapping' que mapea un ID a un mensaje
class MessageMapping(BaseModel):
    id: str
    message: Optional[Message]


# Define la clase 'Conversation' que representa una conversación con múltiples mensajes
class Conversation(BaseModel):
    id: str
    title: Optional[str]
    create_time: float
    update_time: float
    mapping: OrderedDict[str, MessageMapping]

    # Propiedad que devuelve una lista de mensajes en la conversación
    @property
    def messages(self) -> List:
        return [msg.message for k, msg in self.mapping.items() if msg.message and msg.message.text]

    # Propiedad que devuelve la fecha y hora de creación de la conversación como un objeto 'datetime'
    @property
    def created(self) -> datetime:
        return datetime.fromtimestamp(self.create_time)#.strftime('%d/%m/%Y %H:%M:%S')

    # Propiedad que devuelve la fecha y hora de creación de la conversación como una cadena formateada
    @property
    def created_str(self) -> str:
        return self.created.strftime('%d/%m/%Y %H:%M:%S')

    # Propiedad que devuelve la fecha y hora de la última actualización de la conversación como un objeto 'datetime'
    @property
    def updated(self) -> datetime:
        return datetime.fromtimestamp(self.update_time)

    # Propiedad que devuelve la fecha y hora de la última actualización de la conversación como una cadena formateada
    @property
    def updated_str(self) -> str:
        return self.updated.strftime('%d/%m/%Y %H:%M:%S')

    # Propiedad que devuelve el título de la conversación o '[Untitled]' si no tiene título
    @property
    def title_str(self) -> str:
        return self.title or '[Untitled]'

    # Propiedad que calcula la duración total de la conversación en segundos
    @property
    def total_length(self) -> int:
        start_time = self.created
        end_time = max(msg.created for msg in self.messages) if self.messages else start_time
        return (end_time - start_time).total_seconds()


# Función que selecciona archivos JSON en una carpeta dada
def select_conversations(folder_path: str) -> List[str]:
    json_files = []
    for filename in os.listdir(folder_path):
        if filename.endswith(".json"):
            json_files.append(filename)
    return json_files


# Función que carga conversaciones desde un archivo JSON
def load_conversations(path: str) -> List[Conversation]:
    with open(path, 'r') as f:
        conversations_json = json.load(f)

    # Intenta cargar los datos JSON en las clases de modelo
    try:
        conversations = [Conversation(**conv) for conv in conversations_json]
        success = True
    except Exception as e:
        print(str(e))
        sys.exit(1)

    print(f"-- Loaded {len(conversations)} conversations")
    return conversations
