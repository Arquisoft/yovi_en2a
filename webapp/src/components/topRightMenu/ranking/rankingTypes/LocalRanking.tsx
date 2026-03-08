import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import type { RankingElementLocal } from "../rankingElements/RankingElementLocal";
import RankingTableLocal from "../RankingTableLocal";
import type { RankingTypeLocal } from "./RankingTypeLocal";
// Importamos el CSS Module
import styles from './LocalRanking.module.css';

// Función auxiliar para leer una cookie por su nombre
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

const LocalRankingFetcher = () => {
  const [data, setData] = useState<RankingElementLocal[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  
  // Guardaremos la cookie cruda aquí
  const [rawCookieStr, setRawCookieStr] = useState<string | null>(null);

  useEffect(() => {
    // 1. Buscamos la cookie
    const cookieValue = getCookie("user"); 

    if (!cookieValue) {
      setRawCookieStr(null);
      setLoading(false);
      return;
    }

    setRawCookieStr(cookieValue);

    // 2. Descodificamos y parseamos el JSON de forma segura
    let parsedEmail = "";
    try {
      const decodedCookie = decodeURIComponent(cookieValue);
      const userObj = JSON.parse(decodedCookie);
      
      parsedEmail = userObj.email; 
    } catch (e) {
      console.warn("Error parseando la cookie para la base de datos:", e);
      parsedEmail = decodeURIComponent(cookieValue);
    }

    fetch('http://localhost:3000/game/localRankings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: parsedEmail }) 
    })
      .then(res => res.json())
      .then(resData => {
        const mappedData: RankingElementLocal[] = resData.matches.map((match: any, index: number) => ({
          position: index + 1,
          player1Name: match.player1id,
          player2Name: match.player2id,
          result: match.result 
        }));
        setData(mappedData);
      })
      .catch(err => console.error("Error fetching local history:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className={styles.loadingContainer}>Cargando Historial...</div>;
  }

  if (!rawCookieStr) {
    return (
      <div className={styles.notLoggedContainer}>
        <p className={styles.notLoggedText}>
          (You are not logged yet)
        </p>
        <button 
          onClick={() => navigate('/login')} 
          className={styles.loginButton}
        >
          Login
        </button>
      </div>
    );
  }

  let displayUsername = "";
  try {
    const userObj = JSON.parse(decodeURIComponent(rawCookieStr));
    displayUsername = userObj.username;
  } catch (error) {
    console.error("Error al parsear el nombre de usuario:", error);
    displayUsername = "Usuario"; 
  }

  return <RankingTableLocal data={data} title={`Personal Records (${displayUsername})`} />;
};

export class LocalRanking implements RankingTypeLocal {
  id = 'local';
  label = 'Local';
  elements: RankingElementLocal[] = []; 

  render() {
    return <LocalRankingFetcher />;
  }
}