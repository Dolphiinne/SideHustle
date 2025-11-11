import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Bạn là trợ lý AI chuyên nghiệp của TECH SCREEN - cửa hàng chuyên về màn hình điện thoại, laptop và máy tính.

Nhiệm vụ của bạn:
- Tư vấn khách hàng về các loại màn hình phù hợp với nhu cầu
- Giải đáp thắc mắc về sản phẩm, giá cả, chất lượng
- Hướng dẫn cách chọn màn hình phù hợp
- Cung cấp thông tin về các thương hiệu như Samsung, Apple, LG, Dell, ASUS, v.v.
- Giúp khách hàng hiểu về các thông số kỹ thuật: độ phân giải, tần số quét, kích thước, công nghệ màn hình

Phong cách giao tiếp:
- Thân thiện, nhiệt tình và chuyên nghiệp
- Trả lời ngắn gọn, rõ ràng bằng tiếng Việt
- Đưa ra gợi ý cụ thể dựa trên nhu cầu khách hàng
- Luôn sẵn sàng giải đáp thêm chi tiết nếu khách hàng cần

Lưu ý: Nếu khách hỏi về giá cụ thể hoặc tồn kho, hãy khuyến khích họ xem trang sản phẩm hoặc liên hệ trực tiếp để có thông tin chính xác nhất.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Vui lòng nạp thêm credits để sử dụng tính năng này." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Lỗi kết nối AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Lỗi không xác định" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
