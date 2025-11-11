import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Header from "@/components/Header";
import { ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const categories = [
    { value: "all", label: "Tất cả" },
    { value: "phone", label: "Màn hình điện thoại" },
    { value: "laptop", label: "Màn hình laptop" },
    { value: "monitor", label: "Màn hình máy tính" },
  ];

  useEffect(() => {
    fetchProducts();
    fetchCartCount();
    
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const fetchCartCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", user.id);

    const total = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    setCartCount(total);
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase
        .from("cart_items")
        .upsert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        }, {
          onConflict: "user_id,product_id",
        });

      if (error) throw error;
      toast.success("Đã thêm vào giỏ hàng!");
      fetchCartCount();
    } catch (error: any) {
      toast.error("Không thể thêm vào giỏ hàng");
    }
  };

  if (loading) {
    return (
      <>
        <Header cartItemsCount={cartCount} />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Đang tải sản phẩm...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header cartItemsCount={cartCount} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold">Tất Cả Sản Phẩm</h1>
          
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:max-w-sm"
            />
            
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <Badge
                  key={category.value}
                  variant={selectedCategory === category.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden group cursor-pointer">
              <div 
                onClick={() => navigate(`/product/${product.id}`)}
                className="aspect-square overflow-hidden bg-muted"
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  <Badge variant="outline">{categories.find(c => c.value === product.category)?.label || product.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {product.description}
                </p>
                <p className="text-lg font-bold">{product.price.toLocaleString('vi-VN')}đ</p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product.id);
                  }}
                  className="w-full"
                  disabled={product.stock === 0}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {product.stock === 0 ? "Hết hàng" : "Thêm vào giỏ"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Không tìm thấy sản phẩm</p>
          </div>
        )}
      </main>
    </>
  );
};

export default Products;
