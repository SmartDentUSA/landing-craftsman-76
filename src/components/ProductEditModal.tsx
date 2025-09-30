import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageUploader } from './ImageUploader';
import { useCategoryContext } from '@/contexts/CategoryContext';
import { Combobox } from '@/components/ui/combobox';
import { ScrollArea } from './ui/scroll-area';
import { TagInput } from './ui/tag-input';
import { useCategoryConfig } from '@/hooks/useCategoryConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoSection } from './VideoSection';
import { CaptionExtractor } from './CaptionExtractor';
import { Badge } from './ui/badge';
import { ProductAISmartMerge } from './ProductAISmartMerge';
import { FAQEditor } from './FAQEditor';
import { ProductLojaIntegradaImporter } from './ProductLojaIntegradaImporter';

// Interfaces and types
interface Product {
  id: string;
  created_at?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory: string;
  image_url: string;
  images_gallery: string[];
  video_url: string;
  video_title: string;
  video_description: string;
  product_url: string;
  tags: string[];
  active: boolean;
  promo_price: number | null;
  details: any;
  variations: any[];
  faq: any[];
  brand: string;
  gtin: string;
  ean: string;
  mpn: string;
  weight: number;
  height: number;
  width: number;
  depth: number;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSave: (product: Product) => void;
  onDelete: (productId: string) => void;
}

export function ProductEditModal({ isOpen, onClose, product, onSave, onDelete }: ProductEditModalProps) {
  console.log('ProductEditModal rendering...');
  
  const categoryContext = useCategoryContext();
  console.log('CategoryContext:', categoryContext);
  
  const { unifiedCategories, getUnifiedSubcategoriesForCategory } = categoryContext;
  console.log('unifiedCategories:', unifiedCategories);
  
  const { getConfigByCategory } = useCategoryConfig();

  const [formData, setFormData] = useState<Product>({
    id: product.id,
    created_at: product.created_at,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    subcategory: product.subcategory,
    image_url: product.image_url,
    images_gallery: product.images_gallery || [],
    video_url: product.video_url || '',
    video_title: product.video_title || '',
    video_description: product.video_description || '',
    product_url: product.product_url || '',
    tags: product.tags || [],
    active: product.active,
    promo_price: product.promo_price,
    details: product.details || {},
    variations: product.variations || [],
    faq: product.faq || [],
    brand: product.brand || '',
    gtin: product.gtin || '',
    ean: product.ean || '',
    mpn: product.mpn || '',
    weight: product.weight || 0,
    height: product.height || 0,
    width: product.width || 0,
    depth: product.depth || 0,
  });
  const [isNewImage, setIsNewImage] = useState(false);
  const [imagesGallery, setImagesGallery] = useState<string[]>(product.images_gallery || []);
  const [variations, setVariations] = useState<any[]>(product.variations || []);
  const [faq, setFaq] = useState<any[]>(product.faq || []);
  const [subcategories, setSubcategories] = useState<string[]>([]);
	const [weight, setWeight] = useState(product.weight?.toString() || '');
	const [height, setHeight] = useState(product.height?.toString() || '');
	const [width, setWidth] = useState(product.width?.toString() || '');
	const [depth, setDepth] = useState(product.depth?.toString() || '');
  const [promoPrice, setPromoPrice] = useState<number | undefined>(product.promo_price || undefined);
  const [isImporting, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [extractedCaption, setExtractedCaption] = useState<string>('');
  const [isSmartMergeOpen, setIsSmartMergeOpen] = useState(false);
  const [isFAQEditorOpen, setIsFAQEditorOpen] = useState(false);
  const [isLojaIntegradaImporterOpen, setIsLojaIntegradaImporterOpen] = useState(false);

  useEffect(() => {
    if (formData.category) {
      const subcategories = getUnifiedSubcategoriesForCategory(formData.category);
      setSubcategories(subcategories);
    }
  }, [formData.category, getUnifiedSubcategoriesForCategory]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      images_gallery: imagesGallery,
      variations: variations,
      faq: faq,
			weight: parseFloat(weight),
			height: parseFloat(height),
			width: parseFloat(width),
			depth: parseFloat(depth),
      promo_price: promoPrice || null,
    }));
  }, [imagesGallery, variations, faq, weight, height, width, depth, promoPrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, category: value, subcategory: '' }));
  };

  const handleSubcategoryChange = (value: string) => {
    setFormData(prev => ({ ...prev, subcategory: value }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedValue = parseFloat(value);

    if (!isNaN(parsedValue)) {
      setFormData(prev => ({ ...prev, price: parsedValue }));
    } else {
      setFormData(prev => ({ ...prev, price: 0 }));
    }
  };

  const handlePromoPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsedValue = parseFloat(value);

    if (!isNaN(parsedValue)) {
      setPromoPrice(parsedValue);
    } else {
      setPromoPrice(undefined);
    }
  };

  const handleActiveChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, active: checked }));
  };

  const handleTagAdded = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
  };

  const handleTagRemoved = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
    setIsNewImage(true);
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!formData.name || !formData.description || !formData.price || !formData.category || !formData.subcategory) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive"
        });
        return;
      }

      // Convert weight, height, width, and depth to numbers
      const weightValue = parseFloat(weight);
      const heightValue = parseFloat(height);
      const widthValue = parseFloat(width);
      const depthValue = parseFloat(depth);

      if (isNaN(weightValue) || isNaN(heightValue) || isNaN(widthValue) || isNaN(depthValue)) {
        toast({
          title: "Erro",
          description: "Peso, altura, largura e profundidade devem ser números válidos.",
          variant: "destructive"
        });
        return;
      }

      const updatedProduct: Product = {
        ...formData,
        weight: weightValue,
        height: heightValue,
        width: widthValue,
        depth: depthValue,
      };

      await onSave(updatedProduct);
      onClose();
      toast({
        title: "Sucesso",
        description: "Produto salvo com sucesso.",
      });
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar o produto.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(product.id);
      onClose();
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso.",
      });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir o produto.",
        variant: "destructive"
      });
    }
  };

  const handleLojaIntegradaImport = (importedData: any): void => {
    console.log('Dados importados da Loja Integrada:', importedData);
    
    // Mapear campos importados para o formulário
    const updates: Partial<Product> = {};
    
    if (importedData.name) {
      updates.name = importedData.name;
    }
    if (importedData.description) {
      updates.description = importedData.description;
    }
    if (importedData.price) {
      updates.price = importedData.price;
    }
    if (importedData.promo_price) {
      setPromoPrice(importedData.promo_price);
    }
    if (importedData.category) {
      updates.category = importedData.category;
    }
    if (importedData.subcategory) {
      updates.subcategory = importedData.subcategory;
    }
    if (importedData.brand) {
      updates.brand = importedData.brand;
    }
    if (importedData.image_url) {
      updates.image_url = importedData.image_url;
    }
    if (importedData.images_gallery && Array.isArray(importedData.images_gallery)) {
      setImagesGallery(importedData.images_gallery);
    }
    if (importedData.variations && Array.isArray(importedData.variations)) {
      setVariations(importedData.variations);
    }
    if (importedData.gtin) {
      updates.gtin = importedData.gtin;
    }
    if (importedData.ean) {
      updates.ean = importedData.ean;
    }
    if (importedData.mpn) {
      updates.mpn = importedData.mpn;
    }
    if (importedData.weight) {
      setWeight(importedData.weight.toString());
    }
    if (importedData.height) {
      setHeight(importedData.height.toString());
    }
    if (importedData.width) {
      setWidth(importedData.width.toString());
    }
    if (importedData.depth) {
      setDepth(importedData.depth.toString());
    }
    
    // Aplicar atualizações ao formData
    setFormData(prev => ({ ...prev, ...updates }));
    
    toast({
      title: "Dados importados",
      description: "Campos preenchidos com dados da Loja Integrada. Revise antes de salvar.",
    });
  };

  const extractProductDataFromUrl = async (): Promise<void> => {
    if (!formData.product_url?.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma URL válida para importar os dados",
        variant: "destructive"
      });
      return;
    }

    setImporting(true);

    try {
      const response = await fetch(`/api/extract?url=${encodeURIComponent(formData.product_url)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data) {
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          description: data.description || prev.description,
          image_url: data.image_url || prev.image_url,
        }));

        setExtractedCaption(data.description || '');

        toast({
          title: "Dados extraídos",
          description: "Dados do produto extraídos com sucesso.",
        });
      } else {
        setImportError("Não foi possível extrair os dados do produto.");
        toast({
          title: "Erro",
          description: "Não foi possível extrair os dados do produto.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Erro ao extrair dados do produto:", error);
      setImportError(error.message || "Erro ao extrair dados do produto.");
      toast({
        title: "Erro",
        description: "Erro ao extrair dados do produto.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const categoryConfig = getConfigByCategory(formData.category);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[925px]">
        <DialogHeader>
          <DialogTitle>{product.id === 'new' ? "Criar Produto" : "Editar Produto"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="media">Mídia</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="variations">Variações</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input id="brand" name="brand" value={formData.brand} onChange={handleInputChange} />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Preço</Label>
                  <Input type="number" id="price" name="price" value={formData.price} onChange={handlePriceChange} />
                </div>
                <div>
                  <Label htmlFor="promo_price">Preço Promocional</Label>
                  <Input type="number" id="promo_price" name="promo_price" value={promoPrice || ''} onChange={handlePromoPriceChange} />
                </div>
                <div>
                  <Label htmlFor="active">Ativo</Label>
                  <Switch id="active" checked={formData.active} onCheckedChange={handleActiveChange} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Combobox
                    options={unifiedCategories.map(cat => ({ label: cat, value: cat }))}
                    onChange={handleCategoryChange}
                    value={formData.category}
                  />
                </div>
                <div>
                  <Label htmlFor="subcategory">Subcategoria</Label>
                  <Combobox
                    options={subcategories.map(sub => ({ label: sub, value: sub }))}
                    onChange={handleSubcategoryChange}
                    value={formData.subcategory}
                    disabled={!formData.category}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <TagInput tags={formData.tags} onTagAdded={handleTagAdded} onTagRemoved={handleTagRemoved} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media">
            <div className="grid gap-4 py-4">
              <div>
                <Label>Imagem Principal</Label>
                <ImageUploader imageUrl={formData.image_url} onUpload={handleImageUpload} isNewImage={isNewImage} />
              </div>

              <div>
                <Label>Galeria de Imagens</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  <div className="flex gap-2">
                    {imagesGallery.map((image, index) => (
                      <div key={index} className="relative">
                        <img src={image} alt={`Image ${index + 1}`} className="h-24 w-24 object-cover rounded-md" />
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute top-0 right-0 rounded-full"
                          onClick={() => {
                            const newImages = [...imagesGallery];
                            newImages.splice(index, 1);
                            setImagesGallery(newImages);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
                            <path d="M18 6 6 18" />
                            <path d="M6 6 18 18" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                    <ImageUploader onUpload={(url) => setImagesGallery([...imagesGallery, url])} isNewImage={isNewImage} />
                  </div>
                </ScrollArea>
              </div>

              <VideoSection
                videoUrl={formData.video_url}
                videoTitle={formData.video_title}
                videoDescription={formData.video_description}
                onVideoUrlChange={(url) => setFormData(prev => ({ ...prev, video_url: url }))}
                onVideoTitleChange={(title) => setFormData(prev => ({ ...prev, video_title: title }))}
                onVideoDescriptionChange={(description) => setFormData(prev => ({ ...prev, video_description: description }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="details">
            <div className="grid gap-4 py-4">
              {categoryConfig?.detailsConfig?.map((detail, index) => (
                <div key={index}>
                  <Label htmlFor={`details-${detail.key}`}>{detail.label}</Label>
                  {detail.type === 'text' && (
                    <Input
                      type="text"
                      id={`details-${detail.key}`}
                      name={`details-${detail.key}`}
                      value={formData.details[detail.key] || ''}
                      onChange={(e) => {
                        const { value } = e.target;
                        setFormData(prev => ({
                          ...prev,
                          details: { ...prev.details, [detail.key]: value },
                        }));
                      }}
                    />
                  )}
                  {detail.type === 'number' && (
                    <Input
                      type="number"
                      id={`details-${detail.key}`}
                      name={`details-${detail.key}`}
                      value={formData.details[detail.key] || ''}
                      onChange={(e) => {
                        const { value } = e.target;
                        setFormData(prev => ({
                          ...prev,
                          details: { ...prev.details, [detail.key]: value },
                        }));
                      }}
                    />
                  )}
                </div>
              ))}
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div>
									<Label htmlFor="weight">Peso (kg)</Label>
									<Input type="number" id="weight" name="weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="height">Altura (cm)</Label>
									<Input type="number" id="height" name="height" value={height} onChange={(e) => setHeight(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="width">Largura (cm)</Label>
									<Input type="number" id="width" name="width" value={width} onChange={(e) => setWidth(e.target.value)} />
								</div>
								<div>
									<Label htmlFor="depth">Profundidade (cm)</Label>
									<Input type="number" id="depth" name="depth" value={depth} onChange={(e) => setDepth(e.target.value)} />
								</div>
							</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="gtin">GTIN</Label>
                  <Input type="text" id="gtin" name="gtin" value={formData.gtin} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="ean">EAN</Label>
                  <Input type="text" id="ean" name="ean" value={formData.ean} onChange={handleInputChange} />
                </div>
                <div>
                  <Label htmlFor="mpn">MPN</Label>
                  <Input type="text" id="mpn" name="mpn" value={formData.mpn} onChange={handleInputChange} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variations">
            <div className="grid gap-4 py-4">
              <Button onClick={() => setVariations([...variations, { name: '', price: 0, image_url: '' }])}>
                Adicionar Variação
              </Button>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                {variations.map((variation, index) => (
                  <div key={index} className="border p-4 rounded-md mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`variation-name-${index}`}>Nome da Variação</Label>
                        <Input
                          type="text"
                          id={`variation-name-${index}`}
                          value={variation.name}
                          onChange={(e) => {
                            const newVariations = [...variations];
                            newVariations[index].name = e.target.value;
                            setVariations(newVariations);
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`variation-price-${index}`}>Preço da Variação</Label>
                        <Input
                          type="number"
                          id={`variation-price-${index}`}
                          value={variation.price}
                          onChange={(e) => {
                            const newVariations = [...variations];
                            newVariations[index].price = parseFloat(e.target.value);
                            setVariations(newVariations);
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Imagem da Variação</Label>
                      <ImageUploader
                        imageUrl={variation.image_url}
                        onUpload={(url) => {
                          const newVariations = [...variations];
                          newVariations[index].image_url = url;
                          setVariations(newVariations);
                        }}
                        isNewImage={isNewImage}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const newVariations = [...variations];
                        newVariations.splice(index, 1);
                        setVariations(newVariations);
                      }}
                    >
                      Remover Variação
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="faq">
            <div className="grid gap-4 py-4">
              <Button onClick={() => setIsFAQEditorOpen(true)}>
                Editar FAQ
              </Button>
              {faq.length > 0 && (
                <Badge variant="secondary">
                  {faq.length} FAQs
                </Badge>
              )}
            </div>
          </TabsContent>

          <TabsContent value="import">
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="product_url">URL do Produto</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="product_url"
                    name="product_url"
                    value={formData.product_url}
                    onChange={handleInputChange}
                    placeholder="Cole a URL do produto aqui"
                  />
                  <Button type="button" onClick={extractProductDataFromUrl} disabled={isImporting}>
                    {isImporting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12 2A10 10 0 1 0 12 22A10 10 0 0 0 12 2Z">
                            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                          </path>
                        </svg>
                        Importando...
                      </>
                    ) : (
                      "Extrair Dados"
                    )}
                  </Button>
                </div>
                {importError && <p className="text-red-500">{importError}</p>}
                {extractedCaption && (
                  <div>
                    <Label>Descrição Extraída</Label>
                    <Textarea value={extractedCaption} readOnly />
                  </div>
                )}
              </div>
              <div>
                <Button onClick={() => setIsSmartMergeOpen(true)}>
                  Abrir Smart Merge AI
                </Button>
              </div>
              <div>
                <Button onClick={() => setIsLojaIntegradaImporterOpen(true)}>
                  Importar da Loja Integrada
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2">
          {product.id !== 'new' && (
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSave}>
            Salvar
          </Button>
        </div>
      </DialogContent>

      <ProductAISmartMerge
        isOpen={isSmartMergeOpen}
        onClose={() => setIsSmartMergeOpen(false)}
        product={formData}
        setFormData={setFormData}
      />

      <FAQEditor
        isOpen={isFAQEditorOpen}
        onClose={() => setIsFAQEditorOpen(false)}
        faq={faq}
        setFaq={setFaq}
      />

      <ProductLojaIntegradaImporter
        isOpen={isLojaIntegradaImporterOpen}
        onClose={() => setIsLojaIntegradaImporterOpen(false)}
        onImport={handleLojaIntegradaImport}
      />
    </Dialog>
  );
}
