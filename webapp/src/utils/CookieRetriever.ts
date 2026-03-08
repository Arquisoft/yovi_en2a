const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

export function GetEmailFromCookie(): string {
  const cookieValue = getCookie("user"); 

  if (!cookieValue) {
    return "";
  }

  try {
    const decodedCookie = decodeURIComponent(cookieValue);
    const userObj = JSON.parse(decodedCookie);
    
    return userObj.email; 
  } catch (e) {
    console.warn("Error parseando la cookie para la base de datos:", e);
    return decodeURIComponent(cookieValue);
  }
}

export function GetUsernameFromCookie(): string {
    const cookieValue = getCookie("user"); 

    if (!cookieValue) {
        return "User";
    }

    try {
        const userObj = JSON.parse(decodeURIComponent(cookieValue));
        return userObj.username || "User";
    } catch (error) {
        console.error("Error al parsear el nombre de usuario:", error);
        return "User"; 
    }
}
