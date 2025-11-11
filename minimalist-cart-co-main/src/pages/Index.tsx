import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchCartCount();
  }, []);

  const fetchFeaturedProducts = async () => {
    const { data } = await supabase.from("products").select("*").limit(3);

    setFeaturedProducts(data || []);
  };

  const fetchCartCount = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("cart_items")
      .select("quantity")
      .eq("user_id", user.id);

    const total = data?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    setCartCount(total);
  };

  const addToCart = async (productId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      navigate("/auth");
      return;
    }

    try {
      const { error } = await supabase.from("cart_items").upsert(
        {
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        },
        {
          onConflict: "user_id,product_id",
        }
      );

      if (error) throw error;
      toast.success("Đã thêm vào giỏ hàng!");
      fetchCartCount();
    } catch (error: any) {
      toast.error("Không thể thêm vào giỏ hàng");
    }
  };

  return (
    <>
      <Header cartItemsCount={cartCount} />

      <main>
        {/* Hero Section */}
        <section className="relative h-[70vh] flex items-center justify-center bg-muted">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
              Tối Ưu Từng Inch,
              <br />
              Nâng Cấp Hiển Thị
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Chuyên cung cấp các loại màn hình di động, nhỏ gọn nhẹ cho chuyển
              công tác của bạn
            </p>
            <Button size="lg" onClick={() => navigate("/products")}>
              Mua Ngay
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* Featured Products */}
        <section className="container mx-auto px-4 py-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Sản Phẩm Nổi Bật</h2>
            <Button variant="ghost" onClick={() => navigate("/products")}>
              Xem Tất Cả
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden group cursor-pointer"
              >
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
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {product.description}
                  </p>
                  <p className="text-lg font-bold">
                    {product.price.toLocaleString("vi-VN")}đ
                  </p>
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
        </section>

        {/* Features */}
        <section className="bg-muted py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <h3 className="font-bold text-xl mb-2">Vận Chuyển Toàn Quốc</h3>
                <p className="text-muted-foreground">Cho tất cả đơn hàng</p>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Thanh Toán An Toàn</h3>
                <p className="text-muted-foreground">100% bảo mật giao dịch</p>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Sản Phẩm Chất Lượng</h3>
                <p className="text-muted-foreground">Có bảo hành</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Index;
