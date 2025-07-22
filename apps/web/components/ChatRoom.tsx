import axios from "axios"
import { ReceivedMessage } from "../app/room/[roomID]/page";

type SavedMessages = {
  chats : ReceivedMessage[];
}
export async function getChats(roomID : string,limit : number = 50, offset : number = 0) : Promise<SavedMessages["chats"]> {
    const response = axios.get(`/api/room/chats?roomID=${roomID}&limit=${limit}&offset=${offset}`)
    return (await response).data.chats
}

export async function ChatRoom({id}:{
    id : string
}){
    const messages = await getChats(id)
}