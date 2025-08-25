import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  
  // Redirecionar para dashboard
  navigate('/dashboard');
  
  return null;
};

export default Index;
