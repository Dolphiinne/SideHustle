import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Header from "@/components/Header";
import { ArrowLeft, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const categories = {
    phone: "Màn hình điện thoại",
    laptop: "Màn hình laptop",
    monitor: "Màn hình máy tính",
  };

  useEffect(() => {
    fetchProduct();
    fetchCartCount();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error: any) {
      toast.error("Không thể tải sản phẩm");
      navigate("/products");
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

  const addToCart = async () => {
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
          product_id: id!,
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
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </>
    );
  }

  if (!product) return null;

  return (
    <>
      <Header cartItemsCount={cartCount} />
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/products")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square overflow-hidden rounded-lg bg-muted">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-2">
                {categories[product.category as keyof typeof categories] || product.category}
              </Badge>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <p className="text-2xl font-bold text-primary">{product.price.toLocaleString('vi-VN')}đ</p>
            </div>

            <p className="text-muted-foreground">{product.description}</p>

            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Tình trạng:</span>{" "}
                {product.stock > 0 ? (
                  <span className="text-primary">Còn {product.stock} sản phẩm</span>
                ) : (
                  <span className="text-destructive">Hết hàng</span>
                )}
              </p>
            </div>

            <Button
              onClick={addToCart}
              disabled={product.stock === 0}
              size="lg"
              className="w-full md:w-auto"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {product.stock === 0 ? "Hết hàng" : "Thêm vào giỏ"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};

export default ProductDetail;
