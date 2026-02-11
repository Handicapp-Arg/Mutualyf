import React, { useEffect, useState } from 'react';
import styles from './MovingCharacter.module.scss';

const MovingCharacter = ({ imageUrl, height = '89%', isActive }) => {
    const defaultImage = "https://res.cloudinary.com/dkw8e06fo/image/upload/v1682800710/Portfolio2/WhatsApp_Image_2023-04-29_at_15.53.31_low_gctsrz.png";
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const [animationKey, setAnimationKey] = useState(0);

    useEffect(() => {
        if (isActive) {
            setShouldAnimate(true);
            // Incrementar la key para forzar re-render y reiniciar animación
            setAnimationKey(prev => prev + 1);
            // Resetear después de la animación (8 segundos)
            const timer = setTimeout(() => {
                setShouldAnimate(false);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [isActive]);
    
    return (
        <img 
            key={animationKey}
            src={imageUrl || defaultImage} 
            height={height} 
            alt="moving character" 
            className={`${styles.character} ${shouldAnimate ? styles.active : ''}`}
        />
    );
};

export default MovingCharacter;
