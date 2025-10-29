import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  unidade: string;
  bairro: string;
  localidade: string;
  uf: string;
  estado: string;
  regiao: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export function useViaCep() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAddress = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "O CEP deve conter 8 dígitos",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP e tente novamente",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "✅ Endereço encontrado!",
        description: `${data.localidade} - ${data.uf}`
      });

      return {
        cep: data.cep,
        logradouro: data.logradouro,
        complemento: data.complemento,
        bairro: data.bairro,
        city: data.localidade,
        state: data.uf,
        ddd: data.ddd
      };
    } catch (error) {
      console.error('Erro ao consultar ViaCEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Verifique sua conexão e tente novamente",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchAddress, loading };
}
