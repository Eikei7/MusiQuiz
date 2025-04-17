const API_BASE =       'https://6jdz3s8jrh.execute-api.eu-north-1.amazonaws.com';

export const ENDPOINT_REGISTER =          `${API_BASE}/register`;            //POST
export const ENDPOINT_LOGIN =             `${API_BASE}/login`;               //POST
export const ENDPOINT_USERS =             `${API_BASE}/users`;               //GET
export const ENDPOINT_USERS_UPDATE =      `${API_BASE}/users/update`;        //GET
export const ENDPOINT_USERS_DELETE =      `${API_BASE}/users/{email}`;       //DELETE
export const ENDPOINT_USERS_STATS =       `https://zdju8ilmp1.execute-api.eu-north-1.amazonaws.com/dev/users/stats`;         //GET
export const ENDPOINT_USERS_STATS_ALL =   `https://zdju8ilmp1.execute-api.eu-north-1.amazonaws.com/dev/users/stats/all`; //GET
export const ENDPOINT_USERS_STATS_UPDATE =`https://zdju8ilmp1.execute-api.eu-north-1.amazonaws.com/dev/users/stats/update`;  //POST
export const ENDPOINT_ROOMS =             `${API_BASE}/rooms`;               //POST
export const ENDPOINT_ROOMS_START =       `${API_BASE}/rooms/{roomId}/start`;//POST
export const ENDPOINT_ROOMS_GET =         `${API_BASE}/rooms`;               //GET
export const ENDPOINT_ROOMS_GET_ONE =     `${API_BASE}/rooms/{roomId}`;      //GET
export const ENDPOINT_ROOMS_DELETE =      `${API_BASE}/rooms/`;              //DELETE
export const ENDPOINT_ROOMS_JOIN =        `${API_BASE}/rooms/{roomId}/join`; //POST
export const ENDPOINT_ROOMS_LEAVE =       `${API_BASE}/rooms/{roomId}/leave`;//POST
export const ENDPOINT_QUESTIONS =         `${API_BASE}/questions`;           //POST
export const ENDPOINT_QUESTIONS_GET =     `${API_BASE}/questions`;           //GET
export const ENDPOINT_QUESTIONS_GET_ONE = `${API_BASE}/questions/{id}`;      //GET
export const ENDPOINT_QUESTIONS_DELETE =  `${API_BASE}/questions/{id}`;      //DELETE
export const ENDPOINT_QUESTIONS_UPDATE =  `${API_BASE}/questions/{id}`;      //PUT


export const ENDPOINT_CHAT = 'wss://2rd7r2g07b.execute-api.eu-north-1.amazonaws.com/dev';
// export const ENDPOINT_CHAT =             'wss://4nymssc2pg.execute-api.eu-north-1.amazonaws.com/dev';