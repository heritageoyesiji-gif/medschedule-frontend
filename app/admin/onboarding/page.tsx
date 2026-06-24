"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Check, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useCreateFacility } from "@/hooks/useFacilities";
import { getApiErrorMessage } from "@/lib/apiError";

const facilitySchema = z.object({
  name: z.string().min(1, "Facility name is required"),
  address: z.string().min(1, "Address is required"),
  contactEmail: z.string().email("Enter a valid contact email"),
  contactPhone: z.string().min(1, "Contact phone is required"),
});

type FacilityFormValues = z.infer<typeof facilitySchema>;

export default function FacilityOnboardingPage() {
  const router = useRouter();
  const { user, refetch } = useAuth();
  const createFacility = useCreateFacility();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FacilityFormValues>({
    resolver: zodResolver(facilitySchema),
    defaultValues: {
      name: "",
      address: "",
      contactEmail: user?.email ?? "",
      contactPhone: "",
    },
  });

  const onSubmit = async (values: FacilityFormValues) => {
    try {
      const facility = await createFacility.mutateAsync(values);
      await refetch();
      toast.success(`${facility.name} is ready`);
      router.replace("/admin");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to create facility"));
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="space-y-5">
          <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-card text-accent">
            <Building2 className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Set up your facility
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Create the facility workspace before managing staff, schedules,
              requests, and announcements.
            </p>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {[
              "Staff accounts can join with the generated facility ID.",
              "Schedule tools stay locked to your own facility.",
              "Contact details appear in the facility record.",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6"
          noValidate
        >
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Facility name</Label>
              <Input
                id="name"
                autoComplete="organization"
                placeholder="Sunridge Medical Center"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                autoComplete="street-address"
                placeholder="123 Health Ave, Toronto, ON"
                aria-invalid={Boolean(errors.address)}
                {...register("address")}
              />
              {errors.address ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.address.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@sunridge.com"
                  aria-invalid={Boolean(errors.contactEmail)}
                  {...register("contactEmail")}
                />
                {errors.contactEmail ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.contactEmail.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact phone</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+1-416-000-0000"
                  aria-invalid={Boolean(errors.contactPhone)}
                  {...register("contactPhone")}
                />
                {errors.contactPhone ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.contactPhone.message}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={createFacility.isPending}
              className="w-full sm:w-auto"
            >
              {createFacility.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Building2 className="size-4" />
              )}
              Create facility
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
