import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Trash2, Plus, Minus } from "lucide-react";

interface CartItem {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    stock: number;
  };
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchCart();
  }, []);

  const checkAuthAndFetchCart = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Vui lòng đăng nhập để xem giỏ hàng");
      navigate("/auth");
      return;
    }

    fetchCart();
  };

  const fetchCart = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      /**
       * 🚀 SỬA Ở ĐÂY:
       * Dùng alias rõ ràng cho mối quan hệ để tránh lỗi PGRST201
       * (vì có thể Supabase vẫn cache hai quan hệ cũ giữa cart_items và products)
       */
      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `
          id,
          quantity,
          product_id,
          products:cart_items_product_fk (
            id,
            name,
            price,
            image_url,
            stock
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("❌ Fetch cart error:", error);
        throw error;
      }

      // Nếu Supabase vẫn trả về null, fallback gọi API đơn giản hơn
      if (!data || !Array.isArray(data)) {
        console.warn("⚠️ Cart query trả null hoặc sai cấu trúc, dùng fallback");
        const { data: simpleData, error: fallbackError } = await supabase
          .from("cart_items")
          .select("*")
          .eq("user_id", user.id);
        if (fallbackError) throw fallbackError;
        setCartItems(simpleData as any);
      } else {
        setCartItems(data as any);
      }
    } catch (error: any) {
      console.error("❌ Lỗi tải giỏ hàng:", error.message);
      toast.error("Không thể tải giỏ hàng");
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity: newQuantity })
        .eq("id", itemId);

      if (error) throw error;
      fetchCart();
    } catch {
      toast.error("Không thể cập nhật số lượng");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
      fetchCart();
    } catch {
      toast.error("Không thể xóa sản phẩm");
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (item.products?.price || 0) * item.quantity;
    }, 0);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Giỏ hàng của bạn đang trống");
      return;
    }
    navigate("/checkout");
  };

  if (loading) {
    return (
      <>
        <Header cartItemsCount={0} />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Đang tải giỏ hàng...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header cartItemsCount={cartItems.length} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Giỏ Hàng</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Giỏ hàng của bạn đang trống
            </p>
            <Button onClick={() => navigate("/products")}>
              Tiếp Tục Mua Sắm
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.products?.image_url}
                          alt={item.products?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1">
                          {item.products?.name}
                        </h3>
                        <p className="text-lg font-bold text-primary mb-2">
                          {(item.products?.price || 0).toLocaleString("vi-VN")}đ
                        </p>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>

                          <span className="w-12 text-center">
                            {item.quantity}
                          </span>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={
                              item.quantity >= (item.products?.stock || 1)
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <p className="font-bold">
                          {(
                            (item.products?.price || 0) * item.quantity
                          ).toLocaleString("vi-VN")}
                          đ
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-20">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-xl font-bold">Tóm Tắt Đơn Hàng</h2>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tạm tính</span>
                      <span>{calculateTotal().toLocaleString("vi-VN")}đ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Phí vận chuyển
                      </span>
                      <span>Miễn phí</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Tổng cộng</span>
                      <span>{calculateTotal().toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>

                  <Button onClick={handleCheckout} className="w-full" size="lg">
                    Thanh Toán
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Cart;
