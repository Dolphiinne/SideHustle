import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  orderId: string;
  customerName: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { orderId, customerName, total, items }: OrderNotificationRequest =
      await req.json();

    // Get all admin emails
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(
        JSON.stringify({ message: "No admin users to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userIds = adminRoles.map((role) => role.user_id);

    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", userIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw profilesError;
    }

    const adminEmails =
      adminProfiles?.map((profile) => profile.email).filter(Boolean) || [];

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails to notify" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate order items HTML
    const itemsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${
          item.name
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${
          item.quantity
        }</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString(
          "vi-VN"
        )}đ</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${(
          item.quantity * item.price
        ).toLocaleString("vi-VN")}đ</td>
      </tr>
    `
      )
      .join("");

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "Cửa Hàng Màn Hình <onboarding@resend.dev>",
      to: adminEmails,
      subject: `🛒 Đơn hàng mới #${orderId.slice(0, 8)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Đơn Hàng Mới</h1>
          
          <div style="margin: 20px 0;">
            <p><strong>Mã đơn hàng:</strong> #${orderId.slice(0, 8)}</p>
            <p><strong>Khách hàng:</strong> ${customerName}</p>
          </div>

          <h2 style="color: #333; margin-top: 30px;">Chi tiết đơn hàng</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Sản phẩm</th>
                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">SL</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Đơn giá</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="text-align: right; margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="font-size: 18px; margin: 0;"><strong>Tổng cộng: ${total.toLocaleString(
              "vi-VN"
            )}đ</strong></p>
          </div>

          <div style="margin-top: 30px; padding: 15px; background-color: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 4px;">
            <p style="margin: 0;">Vui lòng xử lý đơn hàng này trong trang quản lý.</p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully to admins:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-order-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
